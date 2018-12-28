/*  Copyright 2018 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
    License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html). */
odoo.define('pos_event_registration.pos_event', function (require) {
"use strict";

//var bus = require('bus.bus');
//var local_storage = require('web.local_storage');

var Session = require('web.session');
var screens = require('point_of_sale.screens');
var models = require('point_of_sale.models');
var devices = require('point_of_sale.devices');
var gui = require('point_of_sale.gui');
var core = require('web.core');
var PosDB = require('point_of_sale.DB');
var Model = require('web.DataModel');

var QWeb = core.qweb;
var _t = core._t;


models.load_models({
    model: 'event.event',
    fields: ['name', 'event_ticket_ids'],
    ids:    function(self){
        return [self.config.pos_event[0]];
    },
//    domain: [['id', '=', self.config.pos_event]],
    loaded: function(self, event){
        self.event = {};
        if (event && event.length) {
            self.event = event[0];
        }
    },
});
models.load_models({
    model: 'event.registration',
    fields: ['id', 'name', 'partner_id', 'date_open', 'state', 'email', 'state', 'event_ticket_id'],
    domain: function(self){
        return [['event_id', '=', self.config.pos_event[0]]];
    },
    loaded: function(self, attendees){
        self.db.attendees = attendees;
        self.db.attendee_by_id = {};
        self.db.attendee_sorted = []
        _.each(attendees, function(a){
            self.db.attendee_by_id[a.id] = a;
            self.db.attendee_sorted.push(a);
        });
    },
});
models.load_models({
    model: 'event.event.ticket',
    fields: ['id', 'name', 'event_id', 'product_id', 'registration_ids', 'price'],
    domain: function(self){
        return [['event_id', '=', self.config.pos_event[0]]];
    },
    loaded: function(self, tickets){
        self.db.tickets = tickets;
        self.db.tickets_by_id = [];
        _.each(tickets, function(t) {
            self.db.tickets_by_id[t.id] = t;
        });
        self.ticket_products = _.map(posmodel.db.tickets, function(t) {
            return t.product_id[0]
        });
    },
});
models.load_models({
    model:  'product.product',
    fields: ['display_name', 'list_price','price','pos_categ_id', 'taxes_id', 'barcode', 'default_code',
             'to_weight', 'uom_id', 'description_sale', 'description',
             'product_tmpl_id','tracking'],
    order:  ['sequence','default_code','name'],
    ids:    function(self){
        return self.ticket_products;
    },
    loaded: function(self, products){
        _.each(products, function(p){
            p.price = p.list_price;
        });
        self.db.add_products(products);
    },
});


devices.BarcodeReader.include({
    scan: function(code){
        if (!posmodel.gui.current_screen.attendee_screen) {
            this._super(code);
        }
        var parsed_result = this.barcode_parser.parse_barcode(code);
        this.pos.gui.screen_instances.attendeelist.barcode_attendee_action();
        console.log(parsed_result);
    },
})

var PosModelSuper = models.PosModel;
models.PosModel = models.PosModel.extend({

    load_new_attendees: function(){
        var self = this;
        var def  = new $.Deferred();
        var fields = _.find(this.models,function(model){ return model.model === 'event.registration'; }).fields;
        new Model('event.registration')
            .query(fields)
            .filter([['event_id', '=', self.config.pos_event[0]]])
            .all({'timeout':3000, 'shadow': true})
            .then(function(attendees){
                if (self.db.add_attendees(attendees)) {   // check if the attendees we got were real updates
                    def.resolve();
                } else {
                    def.reject();
                }
            }, function(err,event){ event.preventDefault(); def.reject(); });
        return def;
    },

});

PosDB.include({

    /* TICKETS */

    get_ticket_by_id: function(id){
        return this.tickets[id];
    },

    /* ATTENDEE */

    get_attendees_sorted: function(max_count){
        max_count = max_count ? Math.min(this.attendee_sorted.length, max_count) : this.attendee_sorted.length;
        var attendees = [];
        for (var i = 0; i < max_count; i++) {
            attendees.push(this.attendee_by_id[this.attendee_sorted[i].id]);
        }
        return attendees;
    },
    get_attendee_by_id: function(id){
        return this.attendee_by_id[id];
    },
    add_attendees: function(attendees){
        var updated_count = 0;
        var new_write_date = '';
        var attendee;
        for(var i = 0, len = attendees.length; i < len; i++){
            attendee = attendees[i];

            var local_attendee_date = (this.attendee_date_open || '').replace(/^(\d{4}-\d{2}-\d{2}) ((\d{2}:?){3})$/, '$1T$2Z');
            var dist_attendee_date = (attendee.write_date || '').replace(/^(\d{4}-\d{2}-\d{2}) ((\d{2}:?){3})$/, '$1T$2Z');
            if (    this.attendee_date_open &&
                    this.attendee_by_id[attendee.id] &&
                    new Date(local_attendee_date).getTime() + 1000 >=
                    new Date(dist_attendee_date).getTime() ) {
                continue;
            } else if ( new_write_date < attendee.write_date ) { 
                new_write_date  = attendee.write_date;
            }
            if (!this.attendee_by_id[attendee.id]) {
                this.attendee_sorted.push(attendee.id);
            }
            this.attendee_by_id[attendee.id] = attendee;

            updated_count += 1;
        }

        this.attendee_date_open = new_write_date || this.attendee_date_open;

        if (updated_count) {
            // If there were updates, we need to completely 
            // rebuild the search string and the barcode indexing

            this.attendee_search_string = "";
            this.attendee_by_barcode = {};

            for (var id in this.attendee_by_id) {
                attendee = this.attendee_by_id[id];

                if(attendee.barcode){
                    this.attendee_by_barcode[attendee.barcode] = attendee;
                }
                this.attendee_search_string += this._attendee_search_string(attendee);
            }
        }
        return updated_count;
    },

    _attendee_search_string: function(attendee){
        var str =  attendee.name;
        if(attendee.barcode){
            str += '|' + attendee.barcode;
        }
        if(attendee.partner_id){
            str += '|' + attendee.partner_id[1];
        }
        if(attendee.email){
            str += '|' + attendee.email.split(' ').join('');
        }
        str = '' + attendee.id + ':' + str.replace(':','') + '\n';
        return str;
    },

    search_attendee: function(query){
        try {
            query = query.replace(/[\[\]\(\)\+\*\?\.\-\!\&\^\$\|\~\_\{\}\:\,\\\/]/g,'.');
            query = query.replace(/ /g,'.+');
            var re = RegExp("([0-9]+):.*?"+query,"gi");
        } catch(e) {
            return [];
        }
        var results = [];
        for (var i = 0; i < this.limit; i++) {
            var r = re.exec(this.attendee_search_string);
            if (r) {
                var id = Number(r[1]);
                results.push(this.get_attendee_by_id(id));
            } else {
                break;
            }
        }
        return results;
    },

});


/*--------------------------------------*\
 |           ATTENDEE LIST              |
\*======================================*/

var AttendeeListScreenWidget = screens.ScreenWidget.extend({
    template: 'AttendeeListScreenWidget',

    auto_back: true,
    attendee_screen: true,

    init: function(parent, options){
        this._super(parent, options);
        this.attendee_cache = new screens.DomCache();
    },


    get_attendee: function() {
        return this.current_attendee;
    },
    set_attendee: function(attendee) {
        this.current_attendee = attendee;
        return attendee
    },

    show: function(){
        var self = this;
        this._super();

        this.renderElement();
        this.details_visible = false;
        this.old_client = this.get_attendee();

        this.$('.back').click(function(){
            self.gui.back();
        });

        this.$('.next').click(function(){
            self.save_changes();
            self.gui.back();    // FIXME HUH ?
        });

        /* It should be created during purchase via partner model
        this.$('.new-customer').click(function(){
            self.display_client_details('edit',{
                'country_id': self.pos.company.country_id,
            });
        });*/

        var attendees = this.pos.db.get_attendees_sorted(1000);
        this.render_list(attendees);

        this.reload_attendees();

        if( this.old_client ){
            this.display_client_details('show',this.old_client,0);
        }

        this.$('.client-list-contents').delegate('.client-line','click',function(event){
            self.line_select(event,$(this),parseInt($(this).data('id')));
        });

        var search_timeout = null;

        if(this.pos.config.iface_vkeyboard && this.chrome.widget.keyboard){
            this.chrome.widget.keyboard.connect(this.$('.searchbox input'));
        }

        this.$('.searchbox input').on('keypress',function(event){
            clearTimeout(search_timeout);

            var searchbox = this;

            search_timeout = setTimeout(function(){
                self.perform_search(searchbox.value, event.which === 13);
            },70);
        });

        this.$('.searchbox .search-clear').click(function(){
            self.clear_search();
        });

        this.pos.barcode_reader.set_action_callback({
            'attendee': _.bind(self.barcode_attendee_action, self),
        });
    },
    hide: function () {
        this._super();
        this.new_client = null;
    },

    barcode_attendee_action: function(code){
        if (this.editing_client) {
            this.$('.detail.barcode').val(code.code);
        } else if (this.pos.db.get_attendee_by_barcode(code.code)) {
            var attendee = this.pos.db.get_attendee_by_barcode(code.code);
            this.new_client = attendee;
            this.display_client_details('show', attendee);
        }
    },

    perform_search: function(query, associate_result){
        var customers;
        if(query){
            customers = this.pos.db.search_attendee(query);
            this.display_client_details('hide');
            if ( associate_result && customers.length === 1){
                this.new_client = customers[0];
                this.save_changes();
                this.gui.back();
            }
            this.render_list(customers);
        }else{
            customers = this.pos.db.get_attendees_sorted();
            this.render_list(customers);
        }
    },
    clear_search: function(){
        var customers = this.pos.db.get_attendees_sorted(1000);
        this.render_list(customers);
        this.$('.searchbox input')[0].value = '';
        this.$('.searchbox input').focus();
    },
    render_list: function(attendees){
        var contents = this.$el[0].querySelector('.client-list-contents');
        contents.innerHTML = "";
        for(var i = 0, len = Math.min(attendees.length,1000); i < len; i++){
            var attendee    = attendees[i];
            var clientline = this.attendee_cache.get_node(attendee.id);
            if(!clientline){
                var clientline_html = QWeb.render('AttendeeLine',{widget: this, attendee:attendees[i]});
                var clientline = document.createElement('tbody');
                clientline.innerHTML = clientline_html;
                clientline = clientline.childNodes[1];
                this.attendee_cache.cache_node(attendee.id,clientline);
            }
            if( attendee === this.old_client ){
                clientline.classList.add('highlight');
            }else{
                clientline.classList.remove('highlight');
            }
            contents.appendChild(clientline);
        }
    },
    save_changes: function(){
        var self = this;
        var order = this.pos.get_order();
        if( this.has_client_changed() ){
            var default_fiscal_position_id = _.find(this.pos.fiscal_positions, function(fp) {
                return fp.id === self.pos.config.default_fiscal_position_id[0];
            });
            if ( this.new_client && this.new_client.property_account_position_id ) {
                order.fiscal_position = _.find(this.pos.fiscal_positions, function (fp) {
                    return fp.id === self.new_client.property_account_position_id[0];
                }) || default_fiscal_position_id;
            } else {
                order.fiscal_position = default_fiscal_position_id;
            }

            order.set_client(this.new_client);
        }
    },
    has_client_changed: function(){
        if( this.old_client && this.new_client ){
            return this.old_client.id !== this.new_client.id;
        }else{
            return !!this.old_client !== !!this.new_client;
        }
    },
    toggle_save_button: function(){
        var $button = this.$('.button.next');
        if (this.editing_client) {
            $button.addClass('oe_hidden');
            return;
        } else if( this.new_client ){
            if( !this.old_client){
                $button.text(_t('Set Customer'));
            }else{
                $button.text(_t('Change Customer'));
            }
        }else{
            $button.text(_t('Deselect Customer'));
        }
        $button.toggleClass('oe_hidden',!this.has_client_changed());
    },
    line_select: function(event,$line,id){
        var attendee = this.pos.db.get_attendee_by_id(id);
        this.$('.client-list .lowlight').removeClass('lowlight');
        if ( $line.hasClass('highlight') ){
            $line.removeClass('highlight');
            $line.addClass('lowlight');
            this.display_client_details('hide',attendee);
            this.new_client = null;
            this.toggle_save_button();
        }else{
            this.$('.client-list .highlight').removeClass('highlight');
            $line.addClass('highlight');
            var y = event.pageY - $line.parent().offset().top;
            this.display_client_details('show',attendee,y);
            this.new_client = attendee;
            this.toggle_save_button();
        }
    },
    attendee_icon_url: function(id){
        return '/web/image?model=event.registration&id='+id+'&field=image_small';
    },

    // ui handle for the 'edit selected customer' action
    edit_client_details: function(attendee) {
        this.display_client_details('edit',attendee);
    },

    // ui handle for the 'cancel customer edit changes' action
    undo_client_details: function(attendee) {
        if (!attendee.id) {
            this.display_client_details('hide');
        } else {
            this.display_client_details('show',attendee);
        }
    },

    // what happens when we save the changes on the client edit form -> we fetch the fields, sanitize them,
    // send them to the backend for update, and call saved_client_details() when the server tells us the
    // save was successfull.
    save_client_details: function(attendee) {
        var self = this;

        var fields = {};
        this.$('.client-details-contents .detail').each(function(idx,el){
            fields[el.name] = el.value || false;
        });

        if (!fields.name) {
            this.gui.show_popup('error',_t('A Customer Name Is Required'));
            return;
        }

        if (this.uploaded_picture) {
            fields.image = this.uploaded_picture;
        }

        fields.id           = attendee.id || false;
        fields.country_id   = fields.country_id || false;

        new Model('event.registration').call('create_from_ui',[fields]).then(function(attendee_id){
            self.saved_client_details(attendee_id);
        },function(err,event){
            event.preventDefault();
            var error_body = _t('Your Internet connection is probably down.');
            if (err.data) {
                var except = err.data;
                error_body = except.arguments && except.arguments[0] || except.message || error_body;
            }
            self.gui.show_popup('error',{
                'title': _t('Error: Could not Save Changes'),
                'body': error_body,
            });
        });
    },

    // what happens when we've just pushed modifications for a attendee of id attendee_id
    saved_client_details: function(attendee_id){
        var self = this;
        return this.reload_attendees().then(function(){
            var attendee = self.pos.db.get_attendee_by_id(attendee_id);
            if (attendee) {
                self.new_client = attendee;
                self.toggle_save_button();
                self.display_client_details('show',attendee);
            } else {
                // should never happen, because create_from_ui must return the id of the attendee it
                // has created, and reload_attendee() must have loaded the newly created attendee.
                self.display_client_details('hide');
            }
        });
    },

    // resizes an image, keeping the aspect ratio intact,
    // the resize is useful to avoid sending 12Mpixels jpegs
    // over a wireless connection.
    resize_image_to_dataurl: function(img, maxwidth, maxheight, callback){
        img.onload = function(){
            var canvas = document.createElement('canvas');
            var ctx    = canvas.getContext('2d');
            var ratio  = 1;

            if (img.width > maxwidth) {
                ratio = maxwidth / img.width;
            }
            if (img.height * ratio > maxheight) {
                ratio = maxheight / img.height;
            }
            var width  = Math.floor(img.width * ratio);
            var height = Math.floor(img.height * ratio);

            canvas.width  = width;
            canvas.height = height;
            ctx.drawImage(img,0,0,width,height);

            var dataurl = canvas.toDataURL();
            callback(dataurl);
        };
    },

    // Loads and resizes a File that contains an image.
    // callback gets a dataurl in case of success.
    load_image_file: function(file, callback){
        var self = this;
        if (!file.type.match(/image.*/)) {
            this.gui.show_popup('error',{
                title: _t('Unsupported File Format'),
                body:  _t('Only web-compatible Image formats such as .png or .jpeg are supported'),
            });
            return;
        }

        var reader = new FileReader();
        reader.onload = function(event){
            var dataurl = event.target.result;
            var img     = new Image();
            img.src = dataurl;
            self.resize_image_to_dataurl(img,800,600,callback);
        };
        reader.onerror = function(){
            self.gui.show_popup('error',{
                title :_t('Could Not Read Image'),
                body  :_t('The provided file could not be read due to an unknown error'),
            });
        };
        reader.readAsDataURL(file);
    },

    // This fetches attendee changes on the server, and in case of changes,
    // rerenders the affected views
    reload_attendees: function(){
        var self = this;
        return this.pos.load_new_attendees().then(function(){
            // attendees may have changed in the backend
            self.attendee_cache = new screens.DomCache();

            self.render_list(self.pos.db.get_attendees_sorted(1000));

            // update the currently assigned client if it has been changed in db.
            var curr_client = self.pos.get_order().get_client();
            if (curr_client) {
                self.pos.get_order().set_client(self.pos.db.get_attendee_by_id(curr_client.id));
            }
        });
    },

    // Shows,hides or edit the customer details box :
    // visibility: 'show', 'hide' or 'edit'
    // attendee:    the attendee object to show or edit
    // clickpos:   the height of the click on the list (in pixel), used
    //             to maintain consistent scroll.
    display_client_details: function(visibility,attendee,clickpos){
        var self = this;
        var searchbox = this.$('.searchbox input');
        var contents = this.$('.client-details-contents');
        var parent   = this.$('.client-list').parent();
        var scroll   = parent.scrollTop();
        var height   = contents.height();

        contents.off('click','.button.edit');
        contents.off('click','.button.save');
        contents.off('click','.button.undo');
        contents.on('click','.button.edit',function(){ self.edit_client_details(attendee); });
        contents.on('click','.button.save',function(){ self.save_client_details(attendee); });
        contents.on('click','.button.undo',function(){ self.undo_client_details(attendee); });
        this.editing_client = false;
        this.uploaded_picture = null;

        if(visibility === 'show'){
            contents.empty();
            var related_partner = this.pos.db.get_partner_by_id(attendee.partner_id[0]);
            contents.append($(QWeb.render('AttendeeDetails',{
                widget:this,
                attendee:attendee,
                partner: related_partner,
            })));

            var new_height   = contents.height();

            if(!this.details_visible){
                // resize client list to take into account client details
                parent.height('-=' + new_height);

                if(clickpos < scroll + new_height + 20 ){
                    parent.scrollTop( clickpos - 20 );
                }else{
                    parent.scrollTop(parent.scrollTop() + new_height);
                }
            }else{
                parent.scrollTop(parent.scrollTop() - height + new_height);
            }

            this.details_visible = true;
            this.toggle_save_button();
        } else if (visibility === 'edit') {
            // Connect the keyboard to the edited field
            if (this.pos.config.iface_vkeyboard && this.chrome.widget.keyboard) {
                contents.off('click', '.detail');
                searchbox.off('click');
                contents.on('click', '.detail', function(ev){
                    self.chrome.widget.keyboard.connect(ev.target);
                    self.chrome.widget.keyboard.show();
                });
                searchbox.on('click', function() {
                    self.chrome.widget.keyboard.connect($(this));
                });
            }

            this.editing_client = true;
            contents.empty();
            contents.append($(QWeb.render('AttendeeDetailsEdit',{widget:this,attendee:attendee})));
            this.toggle_save_button();

            // Browsers attempt to scroll invisible input elements
            // into view (eg. when hidden behind keyboard). They don't
            // seem to take into account that some elements are not
            // scrollable.
            contents.find('input').blur(function() {
                setTimeout(function() {
                    self.$('.window').scrollTop(0);
                }, 0);
            });

            contents.find('.image-uploader').on('change',function(event){
                self.load_image_file(event.target.files[0],function(res){
                    if (res) {
                        contents.find('.client-picture img, .client-picture .fa').remove();
                        contents.find('.client-picture').append("<img src='"+res+"'>");
                        contents.find('.detail.picture').remove();
                        self.uploaded_picture = res;
                    }
                });
            });
        } else if (visibility === 'hide') {
            contents.empty();
            parent.height('100%');
            if( height > scroll ){
                contents.css({height:height+'px'});
                contents.animate({height:0},400,function(){
                    contents.css({height:''});
                });
            }else{
                parent.scrollTop( parent.scrollTop() - height);
            }
            this.details_visible = false;
            this.toggle_save_button();
        }
    },
    close: function(){
        this._super();
        if (this.pos.config.iface_vkeyboard && this.chrome.widget.keyboard) {
            this.chrome.widget.keyboard.hide();
        }
    },
});
gui.define_screen({name:'attendeelist', widget: AttendeeListScreenWidget});

var AttendeeButton = screens.ActionButtonWidget.extend({
    template: 'AttendeeButton',
    button_click: function () {
        this.gui.show_screen('attendeelist');
    },
});

screens.define_action_button({
    'name': 'attendee_button',
    'widget': AttendeeButton,
});

});
