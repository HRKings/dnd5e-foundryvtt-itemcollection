## 1.8.0
foundry 0.8.6 compatibility update.
Bags pretty much as a foundry Item. There is a lot of muching around under the hood but most things work as you would expect.
* Item import/export is much faster now.
* All item export also exports currency to the parent (actor or item);
* Weight/gold value update correctly when items are changed, even if not being edited.
* Capacity for items works correctly.
* Only bakcpacks can be item containers. Make sure you enable the sheet for the item to be able to add/remove items.
* Item containers behave like any other item and can be dragged/dropped to actors/work/compendia.
* Item containers can contain other item containers so you can have nested bags.

* Simplified settings. Bag weight, bag price are the only two itemcollection specific settings. Bag weight is the empty weight of the bag. Itemcollection also uses the dnd5e settings, capacity, weightless contents, and capacity type.

* You are best off creating bags via the ItemSheet5eWithBags editor, but once done they can be used much like other items, say you create a backpack called "bag" and give it to the actor "test" and edit with ItemSheet5eWithBags or ItemSheetShop.

* This has been pretty much a complete rewrite of item containers for foundry 0.8.x and I think it works much more cleanly/consistently now.

* A number of migration functions are provided: (A note before migrating - BACKUP YOUR WORLD FIRST - I have run the conversion scripts on my world without it breaking but your mileage may vary)
    await Itemcollection.migrateWorld() - migrates backpacks for all actors, tokens and world items  
    Itemcollection.migrateItems(item collection) - The specific set of items 
    - e.g. await Itemcollection.migrateItems(game.items);  
    Itemcollection.migrateActorItems(actor) - migrate the items for a specific actor  
    Itemcollection.migrateAllActorItems() - migrate items for all world actors  
    Itemcollection.migrateAllTokenItems() - migrate items for all unlinked tokens.  
    Itemcollection.migrateAllItems() - migrate all the world items  

Items work mostly like any other embedded collection, except that they are store in an item flag.
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