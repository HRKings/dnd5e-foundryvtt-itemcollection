## 1.8.6
* Fix for libwrapper conflict warning with Variant Encimbrance.
* For foundry 0.9 removed restriciton on import/export all.

## 1.8.5
* Fix for a deprecation warning.
* Added Itemcollection.createSpellbookFromActor(actor) which will create a new world item with all the spells from the designated actor.
  * Call if from the console via Itemcollection.createSpellbookFromActor(game.actors.getName(" Name of the actor to use))
  * create a macro with 
  ```
  Itemcollection.createSpellBookFromActor(token.actor)
  ```
  which will create a spellbook for the selected token.

## 1.8.4
seems broken
## 1.8.3 
version bump for 0.8.8

## 1.8.2
* Disable import/export all due to occasional data corruption - will re-enable once fixed

## 1.8.1
* An easy way to create item shops. For example:
```
Itemcollection.Shops.createShop("dnd5e.items", "Legendary Shop", {"rarity": "Legendary"}, {minQuantity: 1, createShop: true})
```
Will create a fully populated shop item with all the legendary items from the compendium dnd5e.items.
The syntax is 
* Itemcollection.Shops.createShop(source-compendium-name, shop-name, filters, options)
  - source-compendium-name is any compendium you have that has items in it, e.g. dnd5e.items
  - shop-name is the name of the shop. If the option createShop is true a new shop will be created, otherwise the items are appended to the existing shop.
  - filters are any/all of
    type: "weapon" or any other item type  
    consumableType: "potion" (or any of the consumable subtypes)  
    equipmentType: "light", or any of the other armor types  
    maxPrice: 1000, no items that cost more than this will be included  
    rarity: "Common" or any of the rarity options (Common, Uncommon, Rare.....)  
    nameRegExp: /[Pp]otion/, a regular expression that the name must match.
      A item must pass ALL the filters for it to be included in the shop.
  - options are any/all of
    createShop: true/false. If true a new shop is created, if false the items are appended to the existing shop
    minQuantity: number create items with a quantity of at least number.
    minValue: number - a total of "number" gold pieces worth of the item are created.
Some examples:
```js
Itemcollection.Shops.createShop("dnd5e.items", "Potion Shop", {type: "consumable", consumableType: "potion"}, {minQuantity: 1, createShop: true})
```
will create a shop with one of every potions in it.
Create a shop with all the common swords in it
```js
Itemcollection.Shops.createShop("dnd5e.items", "Sword Shop", {nameRegExp: /[Ss]word/, rarity: "Common"}, {minQuantity: 1, createShop: true})
```
Add in all the uncommon swords.
```js
Itemcollection.Shops.createShop("dnd5e.items", "Sword Shop", {nameRegExp: /[Ss]word/, rarity: "Uncommon"}, {minQuantity: 1, createShop: false})
```
Now add all the rare swords
```js
Itemcollection.Shops.createShop("dnd5e.items", "Sword Shop", {nameRegExp: /[Ss]word/, ratrity: "Rare"}, {minQuantity: 1, createShop: false})
```
The sample Potion Shop was created with:
```
Itemcollection.Shops.createShop("dnd5e.items", "Potion Shop", {rarity: "Common", nameRegExp: /[Pp]otion/}, {minQuantity: 2, minValue: 100, createShop: true})
Itemcollection.Shops.createShop("dnd5e.items", "Potion Shop", {rarity: "Uncommon", nameRegExp: /[Pp]otion/}, {minQuantity: 2, minValue: 200, createShop: false})
Itemcollection.Shops.createShop("dnd5e.items", "Potion Shop", {rarity: "Rare", nameRegExp: /[Pp]otion/}, {minQuantity: 2, minValue: 200, createShop: false})
```
The General Store was created via
```js
Itemcollection.Shops.createShop("dnd5e.items", "General Store", {rarity: "Common"}, {minQuantity: 10, minValue: 10, createShop: true})
```

## 1.8.0
How to migrate once you've installed the update and all your items has disappeared.
Backup your world and then form the console (or a macro) run
```
await Itemcollection.migrateWorld()
```
foundry 0.8.6 compatibility update.
* Item import/export is much faster now.
* All item export also exports currency to the parent (actor or item);
* Weight/gold value update correctly when items are changed, even if not being edited.
* Capacity for items works correctly.
* Only bakcpacks can be item containers. Make sure you enable the sheet for the item to be able to add/remove items.
* Item containers behave like any other item and can be dragged/dropped to actors/work/compendia.
* Item containers can contain other item containers so you can have nested bags.
* Item shop got an overhaul as well - purchasing auto decrements the cost from players inventory.

* Simplified settings. Bag weight and bag price are the only two itemcollection specific settings. Bag weight is the empty weight of the bag. Itemcollection also uses the dnd5e settings, capacity, weightless contents, and capacity type.

* You are best off creating bags via the ItemSheet5eWithBags editor, but once done they can be used much like other items, say you create a backpack called "bag" and give it to the actor "test" and edit with ItemSheet5eWithBags or ItemSheetShop.

* This has been pretty much a complete rewrite of item containers for foundry 0.8.x and I think it works much more cleanly/consistently now.

* A number of migration functions are provided: (A note before migrating - BACKUP YOUR WORLD FIRST - I have run the conversion scripts on my world without it breaking but your mileage may vary)
    await Itemcollection.migrateWorld() - migrates backpacks for all actors, tokens and world items  - this is the one to do it ally.
    Itemcollection.migrateItems(item collection) - The specific set of items 
    - e.g. await Itemcollection.migrateItems(game.items);  
    Itemcollection.migrateActorItems(actor) - migrate the items for a specific actor  
    Itemcollection.migrateAllActorItems() - migrate items for all world actors  
    Itemcollection.migrateAllTokenItems() - migrate items for all unlinked tokens.  
    Itemcollection.migrateAllItems() - migrate all the world items  

Items work mostly like any other embedded collection, except that they are stored in an item flag.

```js
item = game.actors.getName("test").items.getName("bag")
itemToInsert = game.items.getName("Arrows")
item.createEmbeddedDocuments("Item", [itemToInsert.data])
containedItem = item.items.getName("Arrows")
containedItem.uuid
// returns (for example) "Actor.WlOopcsUtThmw4gy.Item.Z6dElT9pzKR1MDNr.Item.kx25jbgap2eixgf2"
itemToDelete = await fromUuid(conatinedItem.uuid)
itemToDelete.delete()
```
* Known Bugs - none so far, but they are certain to be there.

## 1.3.4
updated to ts project/include libWrapper
Requires uninstall and reinstall