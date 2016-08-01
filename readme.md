# little pete
## this a version of the frogger from the  udacity front-end nano degree course.

## play it [here](https://flomair.github.io/little_pete/)

### implemented features:
- the levels can be created by google sheets
- you can use your own story and levels by adding the id of your google sheet in the adress bar
- enemies and items can bump on other enemies, items and the game boundaries
- player, enemies and items are animated with frames
- multiple canvas are used for background and foreground elements
- canvas are resized by css to the window size
- player can be moved by touch
- music and player sounds are played an can get muted
- level beginn, level ending, game won and game over are animated
- gameadvance is saved by cookie and can be reseted on button-click
- gameadvance can be send to other devices by url on button-click
- editmode for game and level develop can accessed by url and toggled on button-click
- images and sounds are each joined in a single sprite

## code
foundation 6 for sites framework with edited gulpfile and jshint was used for development
- source files can be found in src folder
- compiled files can be found in dist folder
- compressed and cleaned files can be found in build folder

used js librayries see under credits



## gameplay

help little pete to get upwards to the house
if you touch an enemy, you'll die… surprise!
you can´t run over water, you'll drown… surprise!
to get over the water, jump on a log. it will move you along. watch out!
collect coins for points, collect lightnings for extra lives
you can´t run through rocks ... jipp. surprise!

## gamecontrol

#### on mobile / touch

tap around pete to move him

tap and hold for pause and accessing the menu functions
tap outside the pause window to resume


#### on desktop

use the arrows to move little pete

hit space for pausing and accessing the menu functions
hit space again to resume


## menu functions

tap on the icons to toggle sound / mute

tap on the upload-icon to create a link with your current game to send it to other devices by email, whatsapp, ...

tap on the refresh-icon to reload the game from scratch


## your story and the levels suck! let me do my own game!!!

ok, here you are

copy the [google sheet](https://docs.google.com/spreadsheets/d/1EV4ibIqoFD6OC5LvyPp5-TvpXGSKZyCJ4YwYzdD67Qw) witch holds the gameplay.
edit the levels and the story
further information can be found [here](https://docs.google.com/document/d/1JvPxzAjZ_CbhhXIQoz9fKE04j_nM_g2yap6HnSU5nis)

hit the wrench to display the game configuration in your adress bar.
the most important part is the "url". paste in your new sheet id and reload. tadaa! now you can select the initial-level and play around with the configuration.
when you are done, hit the cloud button.

the current game url will appear in the adress bar. replace it with your sheet-id and share your game to the world. little pete will now pull your sheet with your story and your levels.


#### credits


## used js libraries

*   #### audio library

    [howlerjs.com](http://howlerjs.com)
    (c) 2013-2016, james simpson of goldfire studios
    goldfirestudios.com

*   #### google sheets integration

    [tabletop.js](https://github.com/jsoma/tabletop)
    copyright (c) 2012-2013 jonathan soma

*   #### cookies

    [javascript cookie v2.1.2](https://github.com/js-cookie/js-cookie)
    copyright 2006, 2015 klaus hartl & fagner brack
    released under the mit license

## images/characters

*   #### all items and little benny

    [opengameart.org/users/bevouliin](opengameart.org/users/bevouliin)

    [bevouliin](http://bevouliin.com)

*   #### background/rock/house

    [loastgarden.com](http://www.lostgarden.com/2007/05/dancs-miraculously-flexible-game.html)
    daniel cook

## sounds

*   #### main theme

    [tristan_lohengrin](https://www.freesound.org/people/tristan_lohengrin/sounds/273539/)

*   #### level start / win

    [littlerobotsoundfactor](https://www.freesound.org/people/littlerobotsoundfactory/sounds/270333/)

*   #### fail

    [davidbain](https://www.freesound.org/people/davidbain/sounds/135831/)

*   #### pete´s sound

    [tintinoko](https://www.freesound.org/people/tintinoko/sounds/277291/)

*   #### outro

    [cabled_mess](https://www.freesound.org/people/cabled_mess/sounds/335361/)