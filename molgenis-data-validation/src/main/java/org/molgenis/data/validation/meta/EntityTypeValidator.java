package org.molgenis.data.validation.meta;

import com.google.common.collect.Multimap;
import org.molgenis.data.DataService;
import org.molgenis.data.MolgenisDataException;
import org.molgenis.data.RepositoryCollection;
import org.molgenis.data.meta.MetaUtils;
import org.molgenis.data.meta.model.Attribute;
import org.molgenis.data.meta.model.EntityType;
import org.molgenis.data.meta.model.Package;
import org.molgenis.data.meta.system.SystemEntityTypeRegistry;
import org.molgenis.data.support.AttributeUtils;
import org.molgenis.data.validation.ConstraintViolation;
import org.molgenis.data.validation.MolgenisValidationException;
import org.molgenis.util.stream.MultimapCollectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;

import static java.lang.String.format;
import static java.util.Objects.requireNonNull;
import static java.util.stream.Collectors.toMap;
import static java.util.stream.StreamSupport.stream;
import static org.molgenis.data.meta.NameValidator.validateName;
import static org.molgenis.data.meta.model.AttributeMetadata.ATTRIBUTE_META_DATA;
import static org.molgenis.data.meta.model.EntityTypeMetadata.ENTITY_TYPE_META_DATA;
import static org.molgenis.data.meta.model.PackageMetadata.PACKAGE;
import static org.molgenis.util.EntityUtils.asStream;

/**
 * Entity metadata validator
 */
@Component
public class EntityTypeValidator
{
	private final DataService dataService;
	private final SystemEntityTypeRegistry systemEntityTypeRegistry;

	@Autowired
	public EntityTypeValidator(DataService dataService, SystemEntityTypeRegistry systemEntityTypeRegistry)
	{
		this.dataService = requireNonNull(dataService);
		this.systemEntityTypeRegistry = requireNonNull(systemEntityTypeRegistry);
	}

	/**
	 * Validates entity meta data
	 *
	 * @param entityType entity meta data
	 * @throws MolgenisValidationException if entity meta data is not valid
	 */
	public void validate(EntityType entityType)
	{
		validateEntityName(entityType);
		validatePackage(entityType);
		validateExtends(entityType);
		validateOwnAttributes(entityType);

		Map<String, Attribute> ownAllAttrMap = stream(entityType.getOwnAllAttributes().spliterator(), false)
				.collect(toMap(Attribute::getIdentifier, Function.identity(), (u, v) ->
				{
					throw new IllegalStateException(String.format("Duplicate key %s", u));
				}, LinkedHashMap::new));

		validateOwnIdAttribute(entityType, ownAllAttrMap);
		validateOwnLabelAttribute(entityType, ownAllAttrMap);
		validateOwnLookupAttributes(entityType, ownAllAttrMap);
		validateBackend(entityType);
	}

	/**
	 * Validate that the entity meta data backend exists
	 *
	 * @param entityType entity meta data
	 * @throws MolgenisValidationException if the entity meta data backend does not exist
	 */
	private void validateBackend(EntityType entityType)
	{
		// Validate backend exists
		String backendName = entityType.getBackend();
		RepositoryCollection repoCollection = dataService.getMeta().getBackend(backendName);
		if (repoCollection == null)
		{
			throw new MolgenisValidationException(new ConstraintViolation(format("Unknown backend [%s]", backendName)));
		}
	}

	/**
	 * Validate that the lookup attributes owned by this entity are part of the owned attributes.
	 *
	 * @param entityType    entity meta data
	 * @param ownAllAttrMap attribute identifier to attribute map
	 * @throws MolgenisValidationException if one or more lookup attributes are not entity attributes
	 */
	private static void validateOwnLookupAttributes(EntityType entityType, Map<String, Attribute> ownAllAttrMap)
	{
		// Validate lookup attributes
		entityType.getOwnLookupAttributes().forEach(ownLookupAttr ->
		{
			// Validate that lookup attribute is in the attributes list
			Attribute ownAttr = ownAllAttrMap.get(ownLookupAttr.getIdentifier());
			if (ownAttr == null)
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Lookup attribute [%s] is not part of the entity attributes", ownLookupAttr.getName())));
			}
		});
	}

	/**
	 * Validate that the label attribute owned by this entity is part of the owned attributes.
	 *
	 * @param entityType    entity meta data
	 * @param ownAllAttrMap attribute identifier to attribute map
	 * @throws MolgenisValidationException if the label attribute is not an entity attribute
	 */
	private static void validateOwnLabelAttribute(EntityType entityType, Map<String, Attribute> ownAllAttrMap)
	{
		// Validate label attribute
		Attribute ownLabelAttr = entityType.getOwnLabelAttribute();
		if (ownLabelAttr != null)
		{
			// Validate that label attribute is in the attributes list
			Attribute ownAttr = ownAllAttrMap.get(ownLabelAttr.getIdentifier());
			if (ownAttr == null)
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Label attribute [%s] is not part of the entity attributes", ownLabelAttr.getName())));
			}
		}
	}

	/**
	 * Validate that the ID attribute owned by this entity is part of the owned attributes.
	 *
	 * @param entityType    entity meta data
	 * @param ownAllAttrMap attribute identifier to attribute map
	 * @throws MolgenisValidationException if the ID attribute is not an entity attribute
	 */
	private static void validateOwnIdAttribute(EntityType entityType, Map<String, Attribute> ownAllAttrMap)
	{
		// Validate ID attribute
		Attribute ownIdAttr = entityType.getOwnIdAttribute();
		if (ownIdAttr != null)
		{
			// Validate that ID attribute is in the attributes list
			Attribute ownAttr = ownAllAttrMap.get(ownIdAttr.getIdentifier());
			if (ownAttr == null)
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Entity [%s] ID attribute [%s] is not part of the entity attributes",
								entityType.getFullyQualifiedName(), ownIdAttr.getName())));
			}

			// Validate that ID attribute data type is allowed
			if (!AttributeUtils.isIdAttributeTypeAllowed(ownIdAttr))
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Entity [%s] ID attribute [%s] type [%s] is not allowed", entityType.getFullyQualifiedName(),
								ownIdAttr.getName(), ownIdAttr.getDataType().toString())));
			}

			// Validate that ID attribute is unique
			if (!ownIdAttr.isUnique())
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Entity [%s] ID attribute [%s] is not a unique attribute", entityType.getFullyQualifiedName(),
								ownIdAttr.getName())));
			}

			// Validate that ID attribute is not nillable
			if (ownIdAttr.isNillable())
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Entity [%s] ID attribute [%s] is not a non-nillable attribute", entityType.getFullyQualifiedName(),
								ownIdAttr.getName())));
			}
		}
		else
		{
			if (!entityType.isAbstract() && entityType.getIdAttribute() == null)
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Entity [%s] is missing required ID attribute", entityType.getFullyQualifiedName())));
			}
		}
	}

	/**
	 * Validates the attributes owned by this entity:
	 * 1) validates that the parent entity doesn't have attributes with the same name
	 * 2) validates that this entity doesn't have attributes with the same name
	 *
	 * @param entityType entity meta data
	 * @throws MolgenisValidationException if an attribute is owned by another entity or a parent attribute has the same name
	 */
	private static void validateOwnAttributes(EntityType entityType)
	{
		// Validate that entity does not contain multiple attributes with the same name
		Multimap<String, Attribute> attrMultiMap = asStream(entityType.getAllAttributes())
				.collect(MultimapCollectors.toArrayListMultimap(Attribute::getName, Function.identity()));
		attrMultiMap.keySet().forEach(attrName ->
		{
			if (attrMultiMap.get(attrName).size() > 1)
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Entity [%s] contains multiple attributes with name [%s]", entityType.getFullyQualifiedName(),
								attrName)));
			}
		});

		// Validate that entity attributes with same name do no exist in parent entity
		EntityType extendsEntityType = entityType.getExtends();
		if (extendsEntityType != null)
		{
			Map<String, Attribute> extendsAllAttrMap = stream(extendsEntityType.getAllAttributes().spliterator(), false)
					.collect(toMap(Attribute::getName, Function.identity(), (u, v) ->
					{
						throw new IllegalStateException(String.format("Duplicate key %s", u));
					}, LinkedHashMap::new));

			entityType.getOwnAllAttributes().forEach(attr ->
			{
				if (extendsAllAttrMap.containsKey(attr.getName()))
				{
					throw new MolgenisValidationException(new ConstraintViolation(
							format("An attribute with name [%s] already exists in entity [%s] or one of its parents",
									attr.getName(), extendsEntityType.getFullyQualifiedName())));
				}
			});
		}
	}

	/**
	 * Validates if this entityType extends another entityType. If so, checks whether that parent entityType is abstract.
	 *
	 * @param entityType entity meta data
	 * @throws MolgenisValidationException if the entity extends from a non-abstract entity
	 */
	private static void validateExtends(EntityType entityType)
	{
		if (entityType.getExtends() != null)
		{
			EntityType extendedEntityType = entityType.getExtends();
			if (!extendedEntityType.isAbstract())
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("EntityType [%s] is not abstract; EntityType [%s] can't extend it",
								entityType.getExtends().getFullyQualifiedName(), entityType.getFullyQualifiedName())));
			}
		}
	}

	/**
	 * Validates the entity fully qualified name and simple name:
	 * - Validates that the entity simple name does not contain illegal characters and validates the name length
	 * - Validates that the fully qualified name, simple name and package name are consistent with each other
	 *
	 * @param entityType entity meta data
	 * @throws MolgenisValidationException if the entity simple name content is invalid or the fully qualified name, simple name and package name are not consistent
	 */
	private static void validateEntityName(EntityType entityType)
	{
		// validate entity name (e.g. illegal characters, length)
		String name = entityType.getFullyQualifiedName();
		if (!name.equals(ATTRIBUTE_META_DATA) && !name.equals(ENTITY_TYPE_META_DATA) && !name.equals(PACKAGE))
		{
			try
			{
				validateName(entityType.getName());
			}
			catch (MolgenisDataException e)
			{
				throw new MolgenisValidationException(new ConstraintViolation(e.getMessage()));
			}
		}

		// Validate that entity name equals entity package name + package separator + entity simple name
		Package package_ = entityType.getPackage();
		if (package_ != null)
		{
			if (!(package_.getFullyQualifiedName() + Package.PACKAGE_SEPARATOR + entityType.getName()).equals(entityType.getFullyQualifiedName()))
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Qualified entity name [%s] not equal to entity package name [%s] underscore entity name [%s]",
								entityType.getFullyQualifiedName(), package_.getFullyQualifiedName(), entityType.getName())));
			}
		}
		else
		{
			if (!entityType.getName().equals(entityType.getFullyQualifiedName()))
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Qualified entity name [%s] not equal to entity name [%s]", entityType.getFullyQualifiedName(),
								entityType.getName())));
			}
		}
	}

	/**
	 * Validate that non-system entities are not assigned to a system package
	 *
	 * @param entityType entity type
	 */
	private void validatePackage(EntityType entityType)
	{
		Package package_ = entityType.getPackage();
		if (package_ != null)
		{
			if (MetaUtils.isSystemPackage(package_) && !systemEntityTypeRegistry
					.hasSystemEntityType(entityType.getFullyQualifiedName()))
			{
				throw new MolgenisValidationException(new ConstraintViolation(
						format("Adding entity [%s] to system package [%s] is not allowed", entityType.getFullyQualifiedName(),
								entityType.getPackage().getFullyQualifiedName())));
			}
		}
	}
}
