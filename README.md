# Item Collections for Foundry VTT

This module provides Items that are capable of holding other items; e.g. bags.

Main features:

Bags are backpack items so can go anywhere a backpack item can, inventory, compendium, world items and hold other items.

- ![Character Sheet](images\Character Sheet.png) 
- Bags can contain other items (including spells and bags). These can be imported and exported to your character's inventory by drag and drop or export/import commands.

- Bags have a capacity indicating how much they can hold. A capacity of 0 means infinite. This can only be set by the GM. If you try and drop an item that is too heavy for the bag the drop will fail and add it to your inventory instead.
- Bags can report a fixed weight in your inventory, think bag of holding (capacity 500, fixed weight 15) or a mule (fixed weight 0, capacity 690). 
- Bags can be unequipped by players or GM, so that their reported weight drops to 0 in your inventory (only bags with a capacity other than 0 can be unequipped). Bags with a fixed weight of 0 are unaffected by equipping/unequipping  the bag.
- ![Multi Bags](images\Multi Bags.png)
- You can create bags of standard equipment, e.g. adventurer's pack which can be dragged onto a character and imported into the inventory. The module ships with a sample compendium of a few bags that you might find useful. Since bags allow you to manipulate the apparent weight of you inventory I suggest that only the GM create these and then drop them into the players inventory. 
- At the GM's discretion (.e.g. module setting) items in bags can be converted to gold at a certain percentage of their value (another setting). The GM can choose to enable this when the party gets to a town to let them easily sell off accumulated loot.
- Bags can hold any item, including spells, classes and features so that you can create spellbooks, e.g. cleric life domain spells that can be dragged onto your character sheet and imported, class starter packs with class, feats, spells and equipment. Also items in bags are sorted so that importing and exporting all spells will create a nicely sorted spell list.
- Items in bags can be compacted - did you find 20 different sets of armour in you treasure pile? Use the compact function to convert them to one line of 20 sets of armour. If you over compact items in a bag there is a split operation to separate them.![Item Compactor Before](images\Item Compactor Before.png)![Item Compactor After](images\Item Compactor After.png)
- The GM can create a world entity party loot item (which is a bag) and drag treasure or treasure bags (which can be attached to npcs - for token only NPCs, i.e. no linked sheet there is a bug that means you should only drag/drop loots parcels from/onto the token and not edit them once dropped) as a default monster treasure. If the player characters have owner permission to the party loot item they can drag and drop to/from it to take the things they want. They can also compact/split/convert to gold items in the party loot item. If they have observer permission they can see what is in it but not drag/drop etc. The * next to the Dungeoneer's pack below  indicates it is a bag and pressing on it will pull items out of the pack into the party loot inventory list. You can leave them as loot parcels as well.
- ![Party Loot](images\Party Loot.png)
- It is suggested that  every player character be given a copy of the "Item Compactor", a zero capacity non-unequip-able  item that will let them manager their inventory without hiding their total item weight.

### Notes
The UI is pretty rough at the moment, it will be improved.

Items in bags CANNOT be edited, only imported/exported/dragged/dropped or converted to gold. You must move the item into your inventory to edit it.

When you drag an item from a bag it is **immediately** removed from the bag. If you subsequently drop it where it can't be received (i.e. non actor/bag [and if GM compendium/world items directory]) it disappears from the game for good. The plus to this is that as you drag items from one bag to another, or inventory to bag there is only a single copy of the item, rather than creating a second copy. In the special case of dragging from one bag to another the drop will be accepted even if it puts the bag contents over the capacity since rejecting the drop would cause the item to disappear.

If worrying about encumbrance is not your idea of fun, just give players a capacity 0, fixed weight 0 item or two and they can just push equipment around to their heart's content.



### Installation Instructions

To install a module, follow these instructions:

1. [Download the zip](https://gitlab.com/tposney/itemcollection/blob/master/itemcollection.zip) file included in the module directory. 
2. Extract the included folder to `public/modules` in your Foundry Virtual Tabletop installation folder.
3. Restart Foundry Virtual Tabletop.  
4. Since this module includes a compendium of items the first time you run foundry will complain and not let you open the compendium. Simply restart foundry a second time and all should be good.
5. To create a bag from scratch, simple create any backpack item then set its iemsheet to be ItemSheet5eWithBags and all the necessary data will be created. I very strongly recommend that you **ONLY** do this for items you want to have as bags since once added the data is there forever.

Once you have a bag (or drag one from the pre-created ones) the gm will see something like this

![All Options - GM view](images\All Options - GM view.png)

The -ALL button exports all items back to the players inventory (if the bag is in a players inventory) and nothing otherwise. The -All and - single actions DO NOT WORK for tokens not lined to an actor.

The -Unequip button will unequip the item from your inventory (setting its weight to 0), it wont remove it. If the bag has a capacity of 0 (infinite) you cannot unequip it. When unequipped it changes to +Equip.

The *Compact button compacts all items into a single line with the correct quantity. For spells, there is no quantity, so this acts as deduplicate. Since the list is always sorted you can use this to tidy up your spell book. 

The +Import brings all items in you inventory into the bag (excepting the bag itself). If the Spells? checkbox is selected then spells will be imported instead. This will only import inventory items, or if spells is ticked all spells from your spellbook. To add other items to a bag you must drop them in.

Normally the weight of the bag updates as you add/delete items (currency weight is included according to the game setting). A GM can set the item to Fixed Weight you can enter a weight in the weight field which is what will be shown in the inventory. It is not a good idea to give players a fixed weight item with capacity 0 (unlimited) since this allows them to keep as much equipment as they like.

The - next to the item exports the item to the characters inventory if the items is owned by a character.

Items can be dragged into or out of the bag. Be careful when dragging out of the bag since the item is immediately removed from the bag when you start the drag. If you change your mind make sure to drop the item back into the bag or it will disappear.

The "two panel" icon next to the "-" is the split item command. If there is more than 1 of the items in the bag it will be split (evenly) to create 2 items with half the quantity each. Useful in the party loot when several players want some of the item.

The players view is slightly different: They cannot set the capacity of the bag, or set it to fixed weight. Notice also that the -Unequip button is not displayed as this item is not owned by the character.

The $ sign converts the item to GP at the module configured setting percentage. The dollar sign only appears if the module setting is enabled. The players view below is slightly different as some functions are disabled, notably setting capacity and fixed weight. Also, in the example below unequip is disabled since the bag has a capacity of 0.

![All Options Player view](images\All Options Player view.png)



- This is an **alpha** release and whilst I have done quite a bit of testing it is quite possible that something will go wrong and trash your items. I **strongly** suggest you try this out in a test world first and make sure you can do what you want. I also strongly suggest you make a backup of you world directory before you start playing.
- I will investigate making items editable for the next release but it may require a substantial change to the code.
- There are two modules flags that are set at world level, can convert items to gold and what percentage of the value is added to the bag when conversion is done.
- As a GM when creating packs for characters set the capacity to 0 until you have everything in the bag, then set the capacity to either whatever their starter pack would be (i.e. 30 for a normal backpack) or a small value, such as 0.1 which means they can take things out of the starter pack but not put things back in, effectively an extract only pack.

### Bugs

Do not edit/manipulate bags that are stored on non-linked NPC tokens (almost all of them). You can drag/drop bags to these tokens, but editing them is broken and will end up reflecting the edits on the associated npc Actor, not the token. So don't do it.

Editing of items in bags is not supported.

Failed drags from a bag cause the item to disappear if no fall-back is available (i.e. dropping into inventory or dropping onto a bag making it overweight which the module will do automatically), but if you drop an item into thin air (like the map) it will disappear.

### Feedback

If you have any suggestions or feedback, please contact me on discord @tposney
