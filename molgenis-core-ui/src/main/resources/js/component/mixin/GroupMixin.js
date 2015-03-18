/* global _: false, React: false, molgenis: true */
(function(_, React, molgenis) {
	"use strict";
	
	var div = React.DOM.div, label = React.DOM.label;
	
	/**
	 * Mixin containing common code for RadioGroup and CheckboxGroup
	 *  
	 * @memberOf component.mixin
	 */
	var GroupMixin = {
		render: function() {
			var options = this.props.options;
			if(!this.props.required) {
				options = options.concat({value: '', label: 'N/A'});
			}
			
			var type = this.props.type;
			var inputs = _.map(options, function(option, i) {
				var control = molgenis.ui.Input({
					type : type,
					name : this.props.name,
					checked : this._isChecked(option),
					disabled : this.props.disabled,
					readOnly: this.props.readOnly,
					value : option.value,
					onValueChange : this._handleChange
				});
				if(this.props.layout === 'vertical') {
					var divClasses = this.props.disabled ? type + ' disabled' : type;
					return (
						div({className: divClasses, key: '' + i},
							label({},
								control, option.label
							)
						)
					);
				} else {
					var labelClasses = this.props.disabled ? type + '-inline disabled' : type + '-inline';
					return (
						label({className: labelClasses, key: '' + i},
							control, option.label
						)
					);
				}
			}.bind(this));
			return div({}, inputs);
		},
		_inputToValue: function(value) {
			return value === '' ? null : value;
		}
	};
	
	// export component
	molgenis.ui = molgenis.ui || {};
	molgenis.ui.mixin = molgenis.ui.mixin || {};
	_.extend(molgenis.ui.mixin, {
		GroupMixin: GroupMixin
	});
}(_, React, molgenis));