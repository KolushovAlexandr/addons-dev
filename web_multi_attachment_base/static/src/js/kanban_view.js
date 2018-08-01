odoo.define('kanban_view', function (require) {
    "use strict";

    var core = require('web.core');
    var KanbanView = require('web.KanbanView');
    var KanbanController = require('web.KanbanController');
    var KanbanRecord = require('web.KanbanRecord');
    var FormView = require('web.FormView');

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

    KanbanRecord.include({
        init: function () {
            var self = this;
            this._super.apply(this, arguments);
            var parent = this.getParent();
            var drop_attachments = parent.arch.attrs.drop_attachments_field;
            this.drop_attachments = drop_attachments;
            console.log(this)
            var super_parent_buttons = parent.getParent().$buttons;
            var add_imgs_button = super_parent_buttons && super_parent_buttons.children('.multiple_images_attachment');
            if (add_imgs_button) {
                add_imgs_button.on('change', '.o_button_select_files', function(event) {
                    self.import_files(event);
                });
            }
        },
        render_buttons: function() {
            var self = this;
            this._super.apply(this, arguments);
            if(this.$buttons && this.drop_attachments) {
                this.$buttons.on('change', '.o_button_select_files', function(event) {
                    self.import_files(event);
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
            var parent = this.getParent();
            var grand_parent = parent.getParent();
            var field_widget = grand_parent.record.fieldsInfo.form.product_image_ids.Widget
            grand_parent.record.data.product_image_ids.data.concat(values);
            this.render();
            this.save_all_records_to_form_view();
        },
        save_all_records_to_form_view: function() {
            var self = this;
            var temp_attach = this.data.records.filter(function(r){
                return r.id === false;
            });
            self.x2m.view.temp_attach = temp_attach;
            this.x2m.view.temp_attach_model = this.drop_attachments_model;
        },
        open_record: function (event, options) {
            if (event.data.id === false) {
                this.do_warn("Can not open the image before it is saved");
            } else {
                this._super(event, options);
            }
        },
        delete_record: function (event) {
            var self = this;
            if (event.data.record.id === false) {
                var record = this.x2m.view.temp_attach.find(function(r) {
                    r.name === event.data.record.name;
                });
                this.x2m.view.temp_attach.splice(this.x2m.view.temp_attach.indexOf(record), 1);
            }
            this._super(event)
        },
    });

    FormView.include({
        init: function () {
            this._super.apply(this, arguments);
            var product_images_field = this.loadParams.fields.product_image_ids;
            if (product_images_field && product_images_field.drop_attachments_field) {
                this.drop_attachments_model = product_images_field.relation;
                this.drop_attachments_field = product_images_field.relation_field;
                this.drop_attachments = this.drop_attachments_field && this.drop_attachments_model;
            }
            console.log(this)
        },
        on_button_save: function() {
            var self = this;
            this._super().then(function(){
                if (self.temp_attach && self.temp_attach.length) {
                    var record_ids = [];
                    self.temp_attach.forEach(function(r) {
                        new Model(self.temp_attach_model).call('create', [r]).then(function(id){
                            record_ids.push(id);
                            if (self.temp_attach.length === record_ids.length) {
                                self.temp_attach = false;
                                return self.reload().then(function() {
                                    self.to_view_mode();
                                    core.bus.trigger('do_reload_needaction');
                                    core.bus.trigger('form_view_saved', self);
                                }).always(function() {
                                    self.enable_button();
                                });
                            }
                        });
                    });
                }
            });
        }
    });
});
