odoo.define('kanban_view', function (require) {
    "use strict";

    var core = require('web.core');
    var KanbanView = require('web.KanbanView');
    var KanbanController = require('web.KanbanController');
    var KanbanRecord = require('web.KanbanRecord');
    var FormView = require('web.FormView');
    var widgetRegistry = require('web.widget_registry');
    var AbstractField = require('web.AbstractField');
    var relational_fields = require('web.relational_fields');
    var rpc = require('web.rpc');


    FormView.include({
        init: function () {
            this._super.apply(this, arguments);
//            var product_images_fieldInfo = this.loadParams.fieldsInfo.form.product_image_ids;
//            var product_images_field = this.loadParams.fields.product_image_ids;
//            if (product_images_fieldInfo && product_images_fieldInfo.context.indexOf('default_product_tmpl_id') > -1) {
//                this.drop_attachments = {};
//                this.drop_attachments.model = product_images_field.relation;
//                this.drop_attachments.field = product_images_field.relation_field;
//                this.drop_attachments.widget = product_images_fieldInfo.Widget;
//            }
            console.log(this)
        },
//        on_button_save: function() {
//            var self = this;
//            this._super().then(function(){
//                if (self.temp_attach && self.temp_attach.length) {
//                    var record_ids = [];
//                    self.temp_attach.forEach(function(r) {
//                        new Model(self.temp_attach_model).call('create', [r]).then(function(id){
//                            record_ids.push(id);
//                            if (self.temp_attach.length === record_ids.length) {
//                                self.temp_attach = false;
//                                return self.reload().then(function() {
//                                    self.to_view_mode();
//                                    core.bus.trigger('do_reload_needaction');
//                                    core.bus.trigger('form_view_saved', self);
//                                }).always(function() {
//                                    self.enable_button();
//                                });
//                            }
//                        });
//                    });
//                }
//            });
//        }
    });




var FieldMultiFiles = AbstractField.extend({
    template: "FieldBinaryFileUploader",
    supportedFieldTypes: ['many2many', 'one2many'],
    fieldsToFetch: {
        name: {type: 'char'},
        datas_fname: {type: 'char'},
        mimetype: {type: 'char'},
    },
    events: {
        'click .o_attach': '_onAttach',
        'click .oe_delete': '_onDelete',
        'change .o_input_file': '_onFileChanged',
    },
    /**
     * @constructor
     */
    init: function () {
        this._super.apply(this, arguments);

        if (this.field.type !== 'many2many' && this.field.type !== 'one2many') {
            var msg = _t("The type of the field '%s' must be a one2many or many2many field.");
            throw _.str.sprintf(msg, this.field.string);
        }

        this.uploadedFiles = {};
        this.uploadingFiles = [];
        this.metadata = {};
    },

    destroy: function () {
        this._super();
        $(window).off(this.fileupload_id);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Compute the URL of an attachment.
     *
     * @private
     * @param {Object} attachment
     * @returns {string} URL of the attachment
     */
    _getFileUrl: function (attachment) {
        return '/web/content/' + attachment.id + '?download=true';
    },
    /**
     * Process the field data to add some information (url, etc.).
     *
     * @private
     */
    _generatedMetadata: function () {
        var self = this;
        _.each(this.value.data, function (record) {
            // tagging `allowUnlink` ascertains if the attachment was user
            // uploaded or was an existing or system generated attachment
            self.metadata[record.id] = {
                allowUnlink: self.uploadedFiles[record.data.id] || false,
                url: self._getFileUrl(record.data),
            };
        });
    },
    /**
     * @private
     * @override
     */
    _render: function () {
        // render the attachments ; as the attachments will changes after each
        // _setValue, we put the rendering here to ensure they will be updated
        this._generatedMetadata();
        this.$('.oe_placeholder_files, .oe_attachments')
            .replaceWith($(qweb.render('FieldBinaryFileUploader.files', {
                widget: this,
            })));
        this.$('.oe_fileupload').show();

        // display image thumbnail
        this.$('.o_image[data-mimetype^="image"]').each(function () {
            var $img = $(this);
            if (/gif|jpe|jpg|png/.test($img.data('mimetype')) && $img.data('src')) {
                $img.css('background-image', "url('" + $img.data('src') + "')");
            }
        });
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onAttach: function () {
        // This widget uses a hidden form to upload files. Clicking on 'Attach'
        // will simulate a click on the related input.
        this.$('.o_input_file').click();
    },
    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onDelete: function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var fileID = $(ev.currentTarget).data('id');
        var record = _.findWhere(this.value.data, {res_id: fileID});
        if (record) {
            this._setValue({
                operation: 'FORGET',
                ids: [record.id],
            });
            var metadata = this.metadata[record.id];
            if (!metadata || metadata.allowUnlink) {
                this._rpc({
                    model: 'ir.attachment',
                    method: 'unlink',
                    args: [record.res_id],
                });
            }
        }
    },
    /**
     * @private
     * @param {Event} ev
     */
    _onFilesCreating: function(attr, files) {
        var self = this;
        var k = 0;
        var done = $.Deferred();
        _.each(files, function(f){
            k += 1;
            var def = $.Deferred();
            var a = rpc.query({
                model: attr.model,
                method: 'create',
                args: [{'name': f.name,
                    'image': f.image,
                    'product_tmpl_id': attr.res_id}],
            }).then(function (res) {
                f.id = res;
                if (k === files.length){
                    done.resolve(files);
                }
            });
            return def;
        });;
        return done;
    },

    _onFileChanged: function (ev) {
        var self = this;
        ev.stopPropagation();

        var files = ev.target.files;
        var attachment_ids = this.value.res_ids;

        _.each(files, function (file) {
            var record = _.find(self.value.data, function (attachment) {
                return attachment.data.name === file.name;
            });
            if (record) {
                var metadata = self.metadata[record.id];
                if (!metadata || metadata.allowUnlink) {
                    // there is a existing attachment with the same name so we
                    // replace it
                    attachment_ids = _.without(attachment_ids, record.res_id);
                    self._rpc({
                        model: 'ir.attachment',
                        method: 'unlink',
                        args: [record.res_id],
                    });
                }
            }
            self.uploadingFiles.push(file);
        });

        this._setValue({
            operation: 'REPLACE_WITH',
            ids: attachment_ids,
        });

        this.$('form.o_form_binary_form').submit();
        this.$('.oe_fileupload').hide();
        ev.target.value = "";
    },
    /**
     * @private
     */
    _onFileLoaded: function (ev, files, rec) {
        var self = this;
        this.uploadingFiles = [];

        var attachment_ids = this.value.res_ids;
        _.each(files, function (file) {
            if (file.error) {
                self.do_warn(_t('Uploading Error'), file.error);
            } else {
                attachment_ids.push(file.id);
                self.uploadedFiles[file.id] = true;
            }
        });

        this.viewType = rec.record.viewType;
        this._setValue({
            operation: 'REPLACE_WITH',
            ids: attachment_ids,
        });
    },
});






    console.log(relational_fields)
    relational_fields.FieldOne2Many.include({
        _renderButtons: function () {
            var self = this;
            this._super();
            var multy_attach = this.$buttons && this.$buttons.find('.o_button_select_files');
            if (!this.isReadonly && this.view.arch.tag === 'kanban' && multy_attach && multy_attach.length) {
                this.drop_att = {};
                this.drop_att.name = this.field.name;
                this.drop_att.model = this.field.relation;
                this.drop_att.field = this.field.relation_field;
                this.drop_att.res_id = this.record.res_id;
                var ma = new FieldMultiFiles(this.getParent(),
                    this.drop_att.name,
                    this.record,
                    {mode: 'edit',}
                );
                multy_attach.on('change', function(event) {
                    var files = event.currentTarget.files;
                    var data = false;
                    var data_files = [];
                    var done = $.Deferred();
                    var k = 0;
                    _.each(files, function(file) {
                        var reader = new FileReader();
                        var def = $.Deferred();
                        // Read in the image file as a data URL.
                        reader.readAsDataURL(file);
                        reader.onloadend = (function(theFile) {
                            data = theFile.target.result;
                            file.data = data.split(',')[1];
                            file.res_id = self.drop_att.res_id;
                            k += 1;
                            def.resolve();
                            if (files.length == k) {
                                done.resolve();
                            }
                        });
                        return def;
                    });
                    done.then(function(){
                        ma._onFilesCreating(self.drop_att, files).then(function(res){
                            ma._onFileLoaded(event, res, self);
                        });
                    });

                });

            }
        },

        import_files: function(event) {
            var self = this;
            var done = $.Deferred();
            // Get Selected files
            var files = event.target.files;
            var values = [];
            _.each(files, function(file) {
                var reader = new FileReader();
                // Read in the image file as a data URL.
                reader.readAsDataURL(file);
                var data = reader.result;
                data = data.split(',')[1];
                var values_to_push = {
                    name: file.name,
                    image: data,
                    id: false,
                }
                values_to_push[self.drop_attachments] = self.getParent().getParent().res_id,
                values.push(values_to_push);
                if (values.length == files.length) {
                    done.resolve();
                }
            });
            done.then(function(){
                self.on_files_uploaded(values);
            });
        },
        on_files_uploaded: function(values) {
            this.create_record(values);
        },
        create_record: function(values) {
            var self = this;
            console.log(relational_fields, FieldMultiFiles)
            var m2m_add_rec = relational_fields.FieldMany2Many.prototype._onAddRecord;


            var val = {
                'stopPropagation': function(){
                        this.stop = true;
                    },
                'data': values,
                'name': "add_record",
                'stopped': false,
                'target': this,
            }

            var ma = new FieldMultiFiles(this.getParent(),
                this.drop_att.name,
                this.record,
                {
                    mode: 'edit',
                });

            console.log(relational_fields, FieldMultiFiles)
        },
    });



























    KanbanView.include({
        init: function () {
            this._super.apply(this, arguments);
            var kanban_fields = this.loadParams.fieldsInfo.kanban;
            if (kanban_fields.product_image_ids) {
                this.drop_attachments_model = this.fields_view.arch.attrs.drop_attachments_model;
                this.drop_attachments_field = this.fields_view.arch.attrs.drop_attachments_field;
                this.drop_attachments = this.drop_attachments_field && this.drop_attachments_model;
            }
        },
        renderButtons: function() {
            var self = this;
            this._super.apply(this, arguments);
            if(this.$buttons && this.drop_attachments) {
                this.$buttons.on('change', '.o_button_select_files', function(event) {
                    self.import_files(event);
                });
            }
        },
    });

//    KanbanRecord.include({
//        init: function () {
//            var self = this;
//            this._super.apply(this, arguments);
//            var parent = this.getParent();
//            var drop_attachments = parent.arch.attrs.drop_attachments_field;
//            this.drop_attachments = drop_attachments;
//            console.log(this)
//            var super_parent_buttons = parent.getParent().$buttons;
//            var add_imgs_button = super_parent_buttons && super_parent_buttons.children('.multiple_images_attachment');
//            if (add_imgs_button) {
//                add_imgs_button.on('change', '.o_button_select_files', function(event) {
//                    self.import_files(event);
//                });
//            }
//        },
//        render_buttons: function() {
//            var self = this;
//            this._super.apply(this, arguments);
//            if(this.$buttons && this.drop_attachments) {
//                this.$buttons.on('change', '.o_button_select_files', function(event) {
//                    self.import_files(event);
//                });
//            }
//        },
//        import_files: function(event) {
//            var self = this;
//            var done = $.Deferred();
//            // Get Selected files
//            var files = event.target.files;
//            var values = [];
//            _.each(files, function(file) {
//                var reader = new FileReader();
//                // Read in the image file as a data URL.
//                reader.readAsDataURL(file);
//                var data = reader.result;
//                data = data.split(',')[1];
//                var values_to_push = {
//                    name: file.name,
//                    image: data,
//                    id: false,
//                }
//                values_to_push[self.drop_attachments] = self.getParent().getParent().res_id,
//                values.push(values_to_push);
//                if (values.length == files.length) {
//                    done.resolve();
//                }
//            });
//            done.then(function(){
//                self.on_files_uploaded(values);
//            });
//        },
//        on_files_uploaded: function(values) {
//            this.create_record(values);
//        },
//        create_record: function(values) {
//            var self = this;
//            var parent = this.getParent();
//            var grand_parent = parent.getParent();
//            var field_widget = grand_parent.record.fieldsInfo.form.product_image_ids.Widget;
//            var field_context = grand_parent.record.data.product_image_ids.getContext();
//            var custom_field = {};
//            var field_values = _.map(values, function(v){
//                custom_field = {};
//                custom_field.context = field_context;
//                custom_field.data = v;
//                return custom_field;
//            })
//            console.log(widgetRegistry);
//            var form = grand_parent.getParent().getParent();
//            var wid = form.initialState.fieldsInfo.form.product_image_ids.Widget;
//            grand_parent.record.data.product_image_ids.data.concat(values);
//            var stat = _.clone(parent.state);
//            stat.data = grand_parent.record.data.product_image_ids.data.concat(field_values);
//            var pre_form = grand_parent.getParent();
//            var widik = pre_form._renderFieldWidget(grand_parent, form.initialState, {});
////            parent._setState(stat)
//            this.render();
//            this.save_all_records_to_form_view();
//        },
//        save_all_records_to_form_view: function() {
//            var self = this;
//            var temp_attach = this.data.records.filter(function(r){
//                return r.id === false;
//            });
//            self.x2m.view.temp_attach = temp_attach;
//            this.x2m.view.temp_attach_model = this.drop_attachments_model;
//        },
//        open_record: function (event, options) {
//            if (event.data.id === false) {
//                this.do_warn("Can not open the image before it is saved");
//            } else {
//                this._super(event, options);
//            }
//        },
//        delete_record: function (event) {
//            var self = this;
//            if (event.data.record.id === false) {
//                var record = this.x2m.view.temp_attach.find(function(r) {
//                    r.name === event.data.record.name;
//                });
//                this.x2m.view.temp_attach.splice(this.x2m.view.temp_attach.indexOf(record), 1);
//            }
//            this._super(event)
//        },
//    });
});
