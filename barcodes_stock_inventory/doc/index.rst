===========================================
 Inventory adjustment via barcode scanning
===========================================

Installation
============

* `Install <https://odoo-development.readthedocs.io/en/latest/odoo/usage/install-module.html>`__ this module in a usual way


Usage
=====

* Open menu ``Inventory >> Inventory Adjustment``
* Click ``[Create]`` or select and click ``[Edit]``

    * For inventory creating

        * Type a ``Name``
        * Select Inventoried Location manually or via scanning a barcode of any available location
        * You may continue working with that inventory via clicking the ``[Start Inventory]`` manually or via ``O-CMD.INV`` barcode or save the created inventory by clicking ``[Save]`` or via barcode ``O-CMD.SAVE``

* In order to add product in an inventory, scan its barcode.
If there are several rows with the same product are presence, the product will be added to a row with the same loaction as `Inventoried Location`, for example:
`Inventoried Location` is *WH/Stock* and locations of the same product are *WH/Stock/Shelf 1* and *WH/Stock/Shelf 2*
a new line with the location *WH/Stock* will be added.
* When the work is done click ``[Validate Inventory]``
* Click ``[Save]``

Inventory Form Barcode List
---------------------------

The following operations on the *Inventory Adjustment* form may be done via barcode scanning:

* ``[Start Inventory]``
* ``[Validate Inventory]``
* ``[Save]`` the inventory
* ``[Create]`` new inventory
* ``[Edit]`` inventory
* ``[Discard]`` changes
* ``[Cancel Inventory]``
* Next inventory in a row
* Previous inventory in a row

You can find barcodes for previous operations in file *Barcode List.pdf* in the module repository.
