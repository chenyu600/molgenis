/* global _: false, molgenis: true */
(function(_, molgenis) {
	"use strict";
	
	var api = new molgenis.RestClient();
	
	/**
	 * @memberOf component.mixin
	 */
	var AttributeLoaderMixin = {
		componentDidMount: function() {
			this._initAttr(this.props.attr);
		},
		componentWillReceiveProps : function(nextProps) {
			if(!_.isEqual(this.props.attr, nextProps.attr)) {
				this._initAttr(nextProps.attr);
			}
		},
		_isLoaded: function(attr) {
			return attr.name !== undefined;
		},
		_initAttr: function(attr) {
			// fetch attribute if not exists
			if(typeof attr === 'object') {
				if(!this._isLoaded(attr)) {
					this._loadAttr(attr.href);
				} else {
					this._setAttr(attr);
				}
			} else if (typeof attr === 'string') {
				this._loadAttr(attr);
			}
		},
		_loadAttr: function(href) {
			api.getAsync(href).done(function(attr) {
				if (this.isMounted()) {
					this._setAttr(attr);
				}
			}.bind(this));
		},
		_setAttr: function(attr) {
			this.setState({attr: attr});
			if(this.props.onAttrInit) {
				this.props.onAttrInit(attr);
			}
		}
	};
	
	// export component
	molgenis.ui = molgenis.ui || {};
	molgenis.ui.mixin = molgenis.ui.mixin || {};
	_.extend(molgenis.ui.mixin, {
		AttributeLoaderMixin: AttributeLoaderMixin
	});
}(_, molgenis));