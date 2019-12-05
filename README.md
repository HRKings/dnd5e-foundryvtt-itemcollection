This module provides Items that are capable of holding other items; e.g. bags.

## Update notes. Version 1.2 is compatible with foundry 0.4.0 and is NOT backwards caompatible with 0.3.9. If you accidentally upgrade while on 0.3.9 let me know and I can make available the previous version.

There are a few steps required for migration.
1. install the module and launch your world. Each itemcolleciton item (i.e. all bags) needs to be opened for edit and a migration will happen behind the scense. A log entry will be posted to the console. The migration also migrates all of the items inside the bag and item inside bags inside the bag etc. Whilst I use the syustem migration code there are a few wrinkles that are managed by my code which of course means there could be bugs so check the items.
2. For items in compendia you must import the item and it will be migrated. Then it can be moved back to the compendia. You **MUST** do the import by right clicking on the item in the compendia and choosing import, trying to open the item from the compendia will not work.

Upgrade notes
1. There are a few minor changes in the way the module works. The sysstem "weightless contents" is not used instead of the fixed weight flag. The bag weight is the sum of the container weight plus the weight of the contents (including gold if the module setting is turned on). If you set equipped to false the reported weight will be 0.
2. You can now edit items in bags, but only 1 level deep, which means you can't edit bags inside bags you must drag them into inventory/sidebar to edit them. The module only displays the item edit icon if you are able to edit. Supporting this requires bags to pretend to have some of the features of an Actor as well as an Item and it is quite possible I have not covered all of the interaction.
3. Import/export/convert to gold/compact all work as they did before.
4. Sometimes updating a field (equipped/weightless/import spells) requires you to close the item sheet before changes take effect.
4. There have been major changes under the hood with this version so there are almost certainly some bugs I have not found so please make a backup of your world (or at lest the items) before using. The module seems stable enough that I have migrated my game world to it, so there is some confidence.
5. Drag and drop still works as before. Dragging from a bag **immediately** deletes it from the bag before you drop it. So if you drop it into a strange place that can't receive it, the item will vanish from the world.
6. Given the rapid changes in the DND5E system (including the fact that there is now a system backpack/container item) I expect that this module will be rendered obsolete - I will of course publish a migration tool when this happens.
7. There is a bug with editing bags inside tokens - put the bags in the Actor sheet rather than the token.
8. Due to the changes in 0.4.x backpack items are not displayed for npcs. This will no doubt change, however if you are brave you can patch
    Data/systems/dnd5e/module/actor/npc.js and change lines 43-50 from
    ```// Categorize Items as Features and Spells
    const features = {
      weapons: { label: "Attacks", items: [] , hasActions: true, dataset: {type: "weapon", "weapon-type": "natural"} },
      actions: { label: "Actions", items: [] , hasActions: true, dataset: {type: "feat", "activation.type": "action"} },
      passive: { label: "Features", items: [], dataset: {type: "feat"} },
      equipment: { label: "Inventory", items: [], dataset: {type: "loot"}}
    };```

to
    ```// Categorize Items as Features and Spells
    const features = {
      weapons: { label: "Attacks", items: [] , hasActions: true, dataset: {type: "weapon", "weapon-type": "natural"} },
      actions: { label: "Actions", items: [] , hasActions: true, dataset: {type: "feat", "activation.type": "action"} },
      passive: { label: "Features", items: [], dataset: {type: "feat"} },
      equipment: { label: "Inventory", items: [], dataset: {type: "loot"}}**,**
      **containers: {label: "Containers", items: [], dataset: {type: "backpack"}}**
    };```
### Main features:

Bags are backpack items (so can go anywhere a backpack item can, inventory, compendium, world items) and hold other items.

- ![Character Sheet](images/Character Sheet.png) 
- Bags can contain any "items" (including spells, feats and other bags). Items can be added to a bag via drag and drop or the import button (which brings in the entire inventory). Items can be removed from a bag via drag and drop to a character inventory, bag, item directory or compendium according to permissions. Items can be exported to you inventory via buttons on the bag sheet.
- Bags have a capacity indicating how much they can hold. A capacity of 0 means infinite. This can only be set by the GM. If you try and drop an from a bag or character inventory into a bag that is too heavy for the bag it will be added to your inventory instead.
- Bags can be set to a fixed weight (as used in the encumberance calculation), think bag of holding (capacity 500, fixed weight 15) or a mule (fixed weight 0, capacity 690). 
- Bags can be unequipped by players or GM, so that their reported weight drops to 0 in your inventory (only bags with a capacity other than 0 can be unequipped).
- ![Multi Bags](images/Multi Bags.png)
- You can create bags of standard equipment, e.g. adventurer's pack which can be dragged onto a character and imported into the inventory. The module ships with a sample compendium of a few bags that you might find useful.
- At the GM's discretion (.e.g. module setting) items in bags can be converted to gold at a certain percentage of their value (another setting). The GM can choose to enable this when the party gets to a town to let them easily sell off accumulated loot.
- Bags can hold any item, including spells, classes and features so that you can create spellbooks, e.g. cleric 1st level spells that can be dragged onto a character imported, also class starter packs with class, feats, spells and equipment.
- Items in bags can be compacted - did you find 20 different sets of armour in you treasure pile? Use the compact function to convert them to one line of 20 sets of armour. If you over compact items in a bag there is a split operation to separate them.![Item Compactor Before](images\Item Compactor Before.png)![Item Compactor After](images\Item Compactor After.png)
- The GM can create a world entity party loot item (which is a bag) and drop treasure or treasure bags If the player characters have owner permission to the party loot item they can drag and drop to/from it to take the things they want. They can also compact/split/convert to gold items in the party loot item. If they have observer permission they can see what is in it but not drag/drop etc. 
- The * next to the Dungeoneer's pack below  indicates it is a bag and pressing on it will pull items out of the pack into the party loot inventory list. You can leave them as loot parcels as well.
- ![Party Loot](images/party Loot.png)
- Player characters can be given a copy of the "Item Compactor" (a zero capacity non-unequip-able item) that will let them manage their inventory without hiding their total item weight.
- A per client module option allows you to have items in bags sorted. This allows you to import your inventory/spellbook and export it again to have a sorted ivnentory/spellbook.
- Due to my ineptitude ONLY bags ownd by Actors or unowned can be editied. To change such a bag drag it to the items directory, change it there and drag back to the token.
- Items dragged from a characters inventory and dropped into a bag are deleted from the characters inventory, so that character only has a single copy of the item.


### Notes
- The UI is pretty rough at the moment, it will be improved.

- Items in bags CANNOT be edited, only imported/exported/dragged/dropped/expanded or converted to gold. You must move the item into your inventory to edit it.

- Bags in unlinked tokens can only be dragged or dropped not editied. (If you try to edit you will see READ ONLY in the item name).

- When you drag an item from a bag it is **immediately** deleted from the bag. If you drop it somewhere that cannot receive it, it will **disappear** from the game. This means that dragging/dropping from bags does not create new items in the game. A better programmer would work out how to delete the item only on drop.

If worrying about encumbrance is not your idea of fun, just give players a capacity 0, fixed weight 0 item or two and they can just push equipment around to their heart's content.



### Installation Instructions

To install a module, follow these instructions:

1. [Download the zip](https://gitlab.com/tposney/itemcollection/raw/master/itemcollection.zip) file included in the module directory, or paste the url for the module.json into the install maodule option.
2. Extract the included folder to `public/modules` in your Foundry Virtual Tabletop installation folder.
3. Restart Foundry Virtual Tabletop.  
4. Since this module includes a compendium of items the first time you run foundry will complain and not let you open the compendium. Simply restart foundry a second time and all should be good.
5. To create a bag from scratch, simple create any backpack item then set its iemsheet to be ItemSheet5eWithBags and all the necessary data will be created. I very strongly recommend that you **ONLY** do this for items you want to have as bags since once added the data is there forever. 
6. **DO NOT** SET THE DEFAULT BACKPACK SHEET TO ItemSheet5eWithBags. If you do the world will explode and terrbie plagues will be brought down on us all. Actually it just means each backpack item you create will also be a bag.

Or use this URL to install via the module isntallation menu in Foundry: https://gitlab.com/tposney/itemcollection/raw/master/module.json
Once you have a bag (or drag one from the pre-created ones) the gm will see something like this. Players will only see the options available to them.

![All Options - GM view](images/All Options - GM view.png)

The -ALL button exports all items back to the players inventory (if the bag is in a players inventory) and nothing otherwise. The -All and - single actions DO NOT WORK for tokens not lined to an actor.

The - next to the item exports the single item to the characters inventory if the items is owned by a character.

The -Unequip button will unequip the item from your inventory (setting its weight to 0), it wont remove it. If the bag has a capacity of 0 (infinite) you cannot unequip it. When unequipped it changes to +Equip.

The *Compact button compacts all items into a single line with the correct quantity. For spells, there is no quantity, so this acts as deduplicate. Since the list is always sorted you can use this to tidy up your spell book. 

The +Import brings all items in you inventory into the bag (excepting the bag itself and other bags). If the Spells? checkbox is selected then spells will be imported instead. This will only import inventory items, or if spells is ticked all spells from your spellbook. To add other items to a bag you must drop them in.

Normally the weight of the bag updates as you add/delete items (currency weight is included according to the game setting). A GM can set the item to Fixed Weight and enter a weight in the adjacent weight field which is what will be shown in the inventory/encumberance. It is not a good idea to give players a fixed weight item with capacity 0 (unlimited) since this allows them to keep as much equipment as they like.

Items can be dragged into or out of the bag. Be careful when dragging out of the bag since the item is immediately removed from the bag when you start the drag. If you change your mind make sure to drop the item back into the bag or it will disappear.

The "two panel" icon next to the "-" is the split item command. If there is more than 1 of the items in the bag it will be split (evenly) to create 2 items with half the quantity each. Useful in the party loot when several players want some of the item.

The players view is slightly different: They cannot set the capacity of the bag, or set it to fixed weight. Notice also that the -Unequip button is not displayed as this item is not owned by the character.

The $ sign converts the item to GP at the module configured setting percentage. The dollar sign only appears if the module setting is enabled. The players view below is slightly different as some functions are disabled, notably setting capacity and fixed weight. Also, in the example below unequip is disabled since the bag has a capacity of 0.

![All Options Player view](images/All Options Player view.png)


### Creating a bag

Create an item and change it's character sheet to ItemSheet5eWithBags. Then edit the item.

**DO NOT SET THE DEFAULT SHEET** to ItemSheet5eWithBags or every backpack item you edit/create will be a bag. If you do create an item as a bag by mistake, change the item sheet back to the default. The item will still be treated as a bag for import/export but otherwise should be fine.

- This is an **alpha** release and whilst I have done quite a bit of testing it is quite possible that something will go wrong and trash your items. I **strongly** suggest you try this out in a test world first and make sure you can do what you want. I also strongly suggest you make a backup of you world directory before you start playing.
- I will investigate making items editable for the next release but it may require a substantial change to the code.
- There are two modules flags that are set at world level, can you convert items to gold and what percentage of the value is added to the bag when conversion is done. These are world flags so can only be set by the GM.
- There is a sort bag contents flag as well, which is settable by each user. Items are sorted by type (weapon, spell etc), then name. Spells are also sorted by level.
- As a GM when creating packs for characters set the capacity to 0 until you have everything in the bag, then set the capacity to either whatever their starter pack would be (i.e. 30 for a normal backpack) or a small value, such as 0.1 which means they can take things out of the starter pack but not put things back in, effectively an extract only pack.

### Bugs

Bags in tokens cannot be edited.

Editing of items in bags is not supported.

The mod is not very chatty about refusing to accept dropped items, there are a few error messages displayed on the user screen.

Item export is quite slow for inventories of many items. This is a side effect of having to await each add from the inventory and my ineptitude at working out how to do it faster.

There is a bug that setting an item to fixed weight is not immediately reflected in the total weight. Simply unequip/equip to update.

Because there are many item create when exporting the actors table gets updated much more often. This can make the system a little slow when the actors table gets very full. Importing does not suffer have the same problem.

### Feedback

If you have any suggestions or feedback, please contact me on discord @tposney
