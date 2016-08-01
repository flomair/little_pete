(function () {
    "use strict";
    /* globals Howl,Cookies,Resources,Tabletop*/
    /*declare "global" vars, catch up the canvas*/
    var win = window,
        game,
        img,
        sound,
        sounds,
        config,
        levels = {},
        curlevel,
        house,
        lastTime,
        gamerel,
        toplift,
        colPos,
        rowPos,
        heart,
        zoomin,
        zoomout,
        pressTimer,
        hashes = {},
        ctb,
        ctbar,
        ctx,
        maskCtx,
        allElements = [],
        allEnemies = [],
        airens = [],
        groundens = [],
        allWoods = [],
        allItems = [],
        player;

    /*load the config */
    $.get("assets/data/config.json", function (conf) {
        config = conf;
        game = conf.game;
        heart = conf.heart;
        img = game.imgbase;
        startengine();
    });

    /*wrapper function for the creation of the members of the element class
    * @ item [string]: type of item to be created,  can be (enemy,item, player, wood)
    * @ obp [object]: the reference to the base object from config.json with the attributes to be inherited from
    * @ ob [object]: object with the specific parameters for this element
    */
    function itemsinit(item, obp, ob) {
        /*injecting the specific values of each element*/
        var Element = function Element(ob) {
            for (var index in ob) {
                this[index] = ob[index];
            }
        };
        /*injecting the attributes by inheritance from the object obp defined in config.json*/
        Element.prototype = Object.create(obp);
        /*render the elements to the canvas with their new frame*/
        Element.prototype.render = function () {
            /* calculate the new frame for this element */
            var frame = Math.floor((game.frame + this.frameind) % this.frames) + 1;
            /* detect the direction for sprite referene*/
            switch (this.direction) {
            case 1:
                var dir = 1;
                break;
            case -1:
                var dir = 2;
                break;
            case 0:
                var dir = 0;
                break;
            }

            var sp = frame + "-" + dir;
            ctx.drawImage(Resources.get(img), 0, this.sprite[sp], this.width, this.height, this.xpos + this.scale + this.hoffset, this.ypos + frame * this.frameoffset + this.scale + this.voffset, this.width - this.scale * 2, this.height - this.scale * 2);
        };
        /*calculating the elements position
            will be called from automove elements (enemies,logs)
        */
        Element.prototype.move = function (dt) {
            this.xpos = this.xpos + dt * this.speed * game.speed * this.direction;
            /*is bump on for this element?
                if yes test for ouside bounds relocate and turn
                if no relocate
            */
            if (this.bump) {
                if (this.xpos + this.width > game.width) {
                    this.direction = -1;
                    this.xpos = game.width - this.width - (this.xpos + this.width - game.width);
                }
                if (this.xpos < 0) {
                    this.direction = 1;
                    this.xpos = 0 - this.xpos;
                }
            } else {
                if (this.xpos > game.width) {
                    this.xpos = 0 - this.width;
                }
                if (this.xpos + this.width < 0) {
                    this.xpos = game.width - this.width;
                }
            }
        };

        /*get the elements bounds for collision detection*/
        Element.prototype.getbounds = function () {
            this.leftb = this.xpos + this.hoffset + this.scale * 2;
            this.rightb = this.xpos + this.width + this.hoffset - this.scale * 2;
        };

        /*create the elements with call to the element constructor for parsing in the properties
        *   @ ob [object]: object with the specific parameters for this element
        */
        var Enemy = function Enemy(ob) {
            Element.call(this, ob);
        };
        Enemy.prototype = Object.create(Element.prototype);
        Enemy.prototype.constructor = Enemy;

        var Item = function Item(ob) {
            Element.call(this, ob);
        };
        Item.prototype = Object.create(Element.prototype);
        Item.prototype.constructor = Item;


        var Wood = function Wood(ob) {
            Element.call(this, ob);
        };
        Wood.prototype = Object.create(Element.prototype);
        Wood.prototype.constructor = Wood;

        var Hero = function Hero(ob) {
            Element.call(this, ob);
        };
        Hero.prototype = Object.create(Element.prototype);
        Hero.prototype.constructor = Hero;

        /*function for moving the palyer/hero will be called by keystroke or touch/click
        *   @ walkdirection [number]: direction to walk to can be (up, down, left, right)
        */
        Hero.prototype.handleInput = function (walkdirection) {

            var currentTime = Date.now();
            /* is paused ?,is player dead ?, is game won ?, is levelover?, last logic preventes keydown from autofire */
            if (!game.paused && !this.dead && !game.won && !game.levelend && currentTime - this.lastkeypress > game.keyrate) {
                this.oldxpos = this.xpos;
                this.oldypos = this.ypos;
                this.oldrow = this.row;
                this.oldcol = this.col;
                /* wich direction to move, will Hero stay inbounds? */
                if (walkdirection === "right" && this.col < game.cols) {
                    this.xpos = this.xpos + 101;
                    this.direction = 1;
                    this.direction = 1;
                    this.col++;
                }
                if (walkdirection === "left" && this.col > 0) {
                    this.xpos = this.xpos - 101;
                    this.direction = -1;
                    this.col--;
                }
                if (walkdirection === "up" && this.row > 0) {
                    this.ypos = this.ypos - 83;
                    this.row--;
                }
                if (walkdirection === "down" && this.row < game.rows) {
                    this.ypos = this.ypos + 83;
                    this.row++;
                }
                /* sroll to new Hero postion, play Hero moving sound, set timer for preventing "autofire" on keydown*/
                scroll(400);
                sounds.play(sound.move);
                this.lastkeypress = currentTime;
            }
        };
        /*handle the players death*/
        Hero.prototype.die = function () {
            if (!this.dead) {
                this.dead = true;
                zoomout.initzoom(this.xpos, this.ypos, "fail");
                game.state = 3;
                game.lives--;
            }
        };
        /*detect wich kind of elment has to be created when the wrapper function is called*/
        switch (item) {
        case "enemy":
            return new Enemy(ob);
        case "item":
            return new Item(ob);
        case "player":
            return new Hero(ob);
        case "wood":
            return new Wood(ob);
        }
    }

    /*create game grid, init the sounds, look for cookies, look for edit hash, create zommers, init keystroke- , click- and touchlistners */
    function startengine() {

        /* create the xpos/ypos grid*/
        rowPos = [];
        for (var i = 0; i <= 99; i++) {
            rowPos.push(i * 83 + game.voffset);
        }
        colPos = [];
        for (var i = 0; i <= 99; i++) {
            colPos.push(i * 101);
        }

        ctb = buildcans("canback", 0);
        ctbar = buildcans("canbar", 2);
        ctx = buildcans("canfront", 1);
        maskCtx = buildcans("maskCanvas", 3);

        /* todo: now using ogg istead of webm for preventing brower detecion issues;=> increases payload by 700kb
        /-detect chrome and remove webm source as chrome seems to fail in looping with howler -/
        if(!!window.chrome && !!window.chrome.webstore){
            //conf.sounds.src.shift();
        }
        */

        /*init the sound libary*/
        sounds = new Howl(config.sounds);
        sound = Object.create(config.sounds.sprite);
        sounds.mute(true);
        for (var m in sound) {
            sound[m] = sounds.play(m);
            sounds.pause(sound[m]);
        }
        sounds.mute(false);

        /*detect the cookies and look up for edit,url or save mode in the */
        var c = Cookies.getJSON("game");
        if (c) {
            game = c;
        }
        gethash("load");

        /* hide intialtext when game was already initialised in the curent saving ( cookie or save url) */
        if (game.init) {
            $("#inittextbox").hide();
        }

        var Zoomer = function (dir) {
            this.animationfactor = 0.52;
            this.direction = dir;
            this.fillStyle = "white";
            this.hoffset = 101 / 2;
            this.voffset = 83 / 2 + config.player.voffset * 2;
        };


        /*function for rendering the "zoomin / zoomout"
        * it will be calculated by the progress of the related sound
        */
        Zoomer.prototype.update = function (dt) {
            this.steps = this.steps + dt * 1000;
            var zoomadv = this.steps / this.time;
            var zoomadvpow = Math.min(Math.pow(Math.abs(zoomadv + this.direction), 3), 1);
            var zoomadvpow2 = Math.min(Math.pow(Math.abs(zoomadv + this.direction), 10), 1);
            this.zoom = this.zoomway * zoomadvpow;
            this.posh = this.hplayer + this.hway * zoomadvpow2;
            this.posv = this.vplayer + this.vway * zoomadvpow2;
            /*using 0.01 instead of 0 for ensuring chrome/webkit not to flick at values < 0.01 */
            if (this.zoom < 0.01) {
                this.zoom = 0.01;
            }

            maskCtx.clearRect(0, 0, game.width, game.height);
            maskCtx.fillStyle = this.fillStyle;
            maskCtx.beginPath();
            maskCtx.arc(this.posh, this.posv, this.zoom, 0, 2 * Math.PI);
            maskCtx.rect(game.width, 0, -game.width, game.height);
            maskCtx.fill();
            if (Math.abs(zoomadv) > 1) {
                game.state++;
            }
        };
        /* set the parameters for the current zoom
        *   @ hplayer [integer]: the current xpos of the player
        *   @ vplayer[integer]: the current ypos of the player
        *   @ s[string]: the name of the sound to be played, wich sets the lenght of the animation
        */
        Zoomer.prototype.initzoom = function (hplayer, vplayer, s) {
            this.time = config.sounds.sprite[s][1] * 0.9;
            this.zoomway = Math.sqrt(Math.pow(game.centerh, 2) + Math.pow(game.centerv, 2));
            this.hplayer = hplayer + this.hoffset;
            this.vplayer = vplayer + this.voffset;
            this.centerh = game.centerh;
            this.centerv = game.centerv;
            this.hway = game.centerh - this.hplayer;
            this.vway = game.centerv - this.vplayer;
            this.steps = 0;
        };

        /* init the zoooms*/
        zoomin = new Zoomer(0);
        zoomout = new Zoomer(-1);

         /* listen to keystrokes for player moving and pausing*/
        document.addEventListener("keydown", function (e) {
            if (e.keyCode === 32) togglepause();
            var allowedKeys = {
                37: "left",
                38: "up",
                39: "right",
                40: "down"
            };

            if (e.keyCode in allowedKeys) {
                player.handleInput(allowedKeys[e.keyCode]);
            }
        });

        /* listen to clicks for player moving, will fire on touchend!*/
        $("#toucherbox").on("click", function (e) {
            if (game.paused) {
                togglepause();
            } else {
                /* relate click to player position */
                var cxo = (player.xpos + player.hoffset + player.width / 2) * gamerel - e.pageX;
                var cyo = (player.ypos + player.voffset + player.height / 2) * gamerel - (e.pageY + $("#allwrap").scrollTop());

                /* where in relation to the player was clicked ?*/
                var cxoa = Math.abs(cxo);
                var cyoa = Math.abs(cyo);
                if (cxo > 0 && cyoa < cxoa) {
                    player.handleInput("left");
                } else {
                    if (cxo < 0 && cyoa < cxoa) {
                        player.handleInput("right");
                    } else {
                        if (cyo > 0 && cxoa < cyoa) {
                            player.handleInput("up");
                        } else {
                            if (cyo < 0 && cxoa < cyoa) {
                                player.handleInput("down");
                            }
                        }
                    }
                }
            }
        });

        /* listen to touchbeg for starting pause timer*/
        $("#toucherbox").on("touchstart", function () {
            if (game.paused) {
                togglepause();
            }
        });

        /*listen to touchend fire pause timer if timer outrun before*/
        $("#toucherbox").on("touchend", function () {
            clearTimeout(pressTimer);
        }).on("touchstart", function () {
            pressTimer = window.setTimeout(function () {
                togglepause();
            }, 500);
        });

        /* listen to clicks on mutetoggle buttons*/
        $(".mutetoggler").on("click", function () {
            $(".mutetoggler").toggleClass("blend");
            game.muted = !game.muted;
        });

        $(".cursors").on("click", function () {
            player.handleInput($(this).attr("dir"));
        });

        /* listen to clicks on close buttons, closes menue*/
        $(".closer").on("click", function () {
            togglepause();
        });

        /* listen to clicks on level difficulty buttons sets game to initialised*/
        $(".levelsector").on("click", function () {
            switch (this.id) {
            case "easy":
                game.speed = game.speed * 0.8;
                break;
            case "hard":
                game.speed = game.speed * 1.2;
                break;
            }
            /* hide initial text*/
            $("#inittextbox").hide();
            /* request fullscreen an small/medium devices*/
            if (!Foundation.MediaQuery.atLeast("large")) {
                requestFullScreen(document.body);
            }
            game.init = true;
            game.state = 0;
        });

        /* listen to clicks on refresh buttons, reloads game from scratch*/
        $(".refresh").on("click", function () {
            refresh();
        });

        /* listen to clicks on save buttons, calls sethash() for save*/
        $(".savegame").on("click", function () {
            gethash();
            if (hashes.save) {
                sethash();
            } else {

                sethash("save=" + window.btoa(JSON.stringify(game)));
            }
        });

        /* listen to clicks on edit buttons, calls sethash() for editmode*/
        $(".editmode").on("click", function () {
            gethash();
            if (hashes.edit) {
                sethash();
            } else {
                sethash("edit=" + JSON.stringify(config.game));
            }
        });

        /* listen to clicks on url buttons, calls sethash() for urlmode*/
        $(".urlmode").on("click", function () {
            gethash();
            if (hashes.url) {
                sethash();
            } else {
                sethash("url=" + game.url);
            }
        });

        /* listen to clicks on edittoggler, opens edit manual in inittext*/
        $(".edittoggler").on("click", function () {
            showedit();
        });

        /* listen to clicks on credittoggler, opens edit credits in inittext*/
        $(".credittoggler").on("click", function () {
            $(".inithide2").toggle();
        });

        /* listen to resize for calling resizecanvas*/
        $(window).resize(function () {
            resizecanvas();
            scroll("fast");
        });
        /* listen to orientationchange for calling resizecanvas*/
        window.addEventListener("orientationchange", function () {
            resizecanvas();
            scroll("fast");
        }, false);

        /*init foundation for reveal/ popup creation*/
        $(document).foundation();
        /* load the sprite and step into next funtion onload*/
        Resources.load(img);
        Resources.onReady(loadlevels);

        /* funtion for catching up the canvas
        *   @c[string]: id of the canvas to be catched
        *   @z[integer]: the z-index to be set
        */
        function buildcans(c, z) {
            var can = document.getElementById(c);
            var ct = can.getContext("2d");
            $(can).css("zIndex", z);
            return ct;
        }
    }

    /* load the levels.json or if urlmode or editmode is used pull the google sheet and load
     it into var level and log the output for copy and paste to levels.json    */
    function loadlevels() {
        /* is url set?*/
        //if(game.loadremotelev){
        if (2 === 1) {
            /* pull the sheet defidned by game.url and pass it to createlevels */
            var public_spreadsheet_url = "https://docs.google.com/spreadsheet/pub?hl=en_US&hl=en_US&key=" + game.url;
            Tabletop.init({
                key: public_spreadsheet_url,
                callback: createlevels,
                simpleSheet: false,
                parseNumbers: true
            });
        } else {
            $.get("assets/data/levels.json", function (lev) {
                levels = lev;
                parselevel();
            });
        }

        /* load the gamplay pulled from google sheets
        *   @ data[object]: data of the google sheet in json format
        */
        function createlevels(data) {
            /* sort the woorkbooks for ensuring the levels are in order of their workbooknames*/
            var wb = sortObject(data);

            var ll = 1;
            /* loop through each workbook eg. level in sheet an set/reset the receiving array for the elements */
            for (var s in wb) {
                var ret = {};
                ret.board = [];
                ret.elems = {
                    "enemies": {
                        "ground": [{ "type": "enemy", "name": "ground" }],
                        "air": [{ "type": "enemy", "name": "air" }]
                    },
                    "wood": { "wood": [{ "type": "wood", "name": "wood" }] },
                    "items": {
                        "stones": [{ "type": "item", "name": "stones" }],
                        "coins": [{ "type": "item", "name": "coins" }],
                        "power": [{ "type": "item", "name": "power" }]
                    }
                };

                var sheet = ob2arr(wb[s].elements);
                var size = Object.keys(sheet).length;
                /* set the base variables for the workbook eg. level:
                *to  be set : levelname,levelpoints, playerentrycol, playerexitcol,
                levelcharacter: for pause menue, leveltext : for pause menue */

                for (var r = 1; r < size; r++) {
                    if (sheet[r][0] === "boardbegin") break;
                    ret[sheet[r][0]] = sheet[r][1];
                }
                r++;
                var n = 1;
                var rl = Object.keys(sheet[r]).length;
                /* loop through each row of the board */
                for (r = r + 1; r < rl; r++) {
                    if (sheet[r][0] === "boardend") break;
                    /* create an array of empty objects as receivers for the different elements*/
                    var olist = [{}, {}, {}, {}, {}, {}],
                        row = sheet[r];
                    var op = 0;
                    /* loop through each column of the row with offset of the row base variables */
                    for (var f = 4; f < rl; f = f + 6) {
                        /*loop through the different elements to be set, and fill the element specific object */
                        for (var ol = 0; ol < olist.length; ol++) {
                            if (wasset(row[f + ol])) olist[ol][op] = wassetx(row[f + ol]);
                        }
                        op++;
                    }
                    /* fill in the row elements */
                    ret.elems.enemies.ground.push(olist[0]);
                    ret.elems.enemies.air.push(olist[1]);
                    ret.elems.wood.wood.push(olist[2]);
                    ret.elems.items.stones.push(olist[3]);
                    ret.elems.items.coins.push(olist[4]);
                    ret.elems.items.power.push(olist[5]);
                    /* fill in the row basevariables */
                    ret.board[n] = { "rowtype": row[0], "groundbump": wasset(row[1]), "airbump": wasset(row[2]), "woodbump": wasset(row[3]) };
                    ret.rows = n + 1;
                    ret.cols = op - 1;
                    n++;
                }
                /* inject the entry and exit row*/
                ret.board[0] = { "rowtype": "grass", "groundbump": false, "airbump": false, "woodbump": false };
                ret.board[n] = { "rowtype": "grass", "groundbump": false, "airbump": false, "woodbump": false };
                levels[ll] = ret;

                ll++;
            }
            /* output the levels as c&p able jsonstring for pasting it into levels.json */
            try {
               // console.log(JSON.stringify(levels));
            } catch (err) {
            }
            parselevel();
        }

        /* convert an object to an array
        *   @ ob[object]: object to be converted
        */
        function ob2arr(ob) {
            var array = $.map(ob, function (value) {
                return [value];
            });
            return array;
        }

        /* sort an object by converting  to array, sort and converting backwards
        * @ o[object]: object to be sorted
        */
        function sortObject(o) {
            var sorted = {},
                key, a = [];
            for (key in o) {
                if (o.hasOwnProperty(key)) {
                    a.push(key);
                }
            }
            a.sort();
            for (key = 0; key < a.length; key++) {
                sorted[a[key]] = o[a[key]];
            }
            return sorted;
        }

        /* detect if an value is set
        * @ v[object]: value to be tested
        */
        function wasset(v) {
            return v !== "" && v ? true : false;
        }

        /* detect if an value is not set to "x"
        * @ v[object]: value to be tested
        */
        function wassetx(v) {
            return v !== "x" ? v : 0;
        }
    }

    /* will be called if an new level has to b loaded resets the elements array and parses the current level into it with pointig the curitem to the class from the config,  */
    function parselevel() {
        curlevel = levels[game.level];
        /* detect if current level is defined otherwise asume all levels are won => game won */
        if (curlevel === undefined) {
            game.state = 8;
            return;
        }
        /* parse the information from current level and show up the inital text and hide the "load" animation if first level
           parse the information from current level into menue
        */
        if(game.level === 1){
            injectinfo("init");
            $(".spinner").fadeOut(10, function() {
                $("#inittextboxinner").fadeIn(10);
            });
        }
        injectinfo("menue");

        /* set the target / house won´t be reset couse it´s fixed in the level*/
        house = config.items.house;
        house.ypos = rowPos[0];
        house.xpos = colPos[curlevel.playerexitcol];
        house.row = 0;
        house.col = curlevel.playerexitcol;
        house.direction = 0;

        /* reset the holder array of the elements used for recreation in function reset */
        var curitem,
            curitem2 = {};
        allElements = [];

        /* fill allelements with the three variables required from itemsinit for the current element
                * 1.: type of item to be created,  can be (enemy,item, player, wood)
                * 2.: the reference to the base object from config.json with the attributes to be inherited from
                * 3.: object with the specific parametes for this item
        */


        curitem = config.player;
        curitem2.ypos = rowPos[curlevel.rows];
        curitem2.xpos = colPos[curlevel.playerentrycol];
        curitem2.row = curlevel.rows;
        curitem2.col = curlevel.playerentrycol;
        curitem2.direction = 1;
        curitem2.lastkeypress = 0;
        curitem2.onwood = false;
        curitem2.frameind = Math.floor(Math.random() * 99 + 1);
        allElements.push(["player", curitem, curitem2]);

        var elems = curlevel.elems;
        /* loop through rows */
        for (var el in elems) {
            /* loop through row>columns */
            for (var it in elems[el]) {
                var element = elems[el][it];
                /* loop through row>column>elementtypes */
                for (var i = 1; i < element.length; i++) {
                    /*detect class of element for inheritance*/
                    switch (element[0].type) {
                    case "enemy":
                        curitem = config.enemies[curlevel.board[i].rowtype + element[0].name];
                        break;
                    default:
                        curitem = config.items[element[0].name];
                    }
                    /*detect if bump is on for element type*/
                    switch (element[0].name) {
                    case "ground":
                        var bump = curlevel.board[i].groundbump;
                        break;
                    case "air":
                        var bump = curlevel.board[i].airbump;
                        break;
                    case "wood":
                        var bump = curlevel.board[i].woodbump;
                        break;
                    default:
                    }
                    /* loop through row>column>elementtypes>elements */
                    for (var s in element[i]) {
                        var curitem2 = {};
                        curitem2.speed = Math.abs(element[i][s]);
                        switch (true) {
                        case element[i][s] === 0:
                            curitem2.direction = 0;
                            break;
                        case element[i][s] < 0:
                            curitem2.direction = -1;
                            break;
                        case element[i][s] > 0:
                            curitem2.direction = 1;
                        }
                        curitem2.bump = bump;
                        curitem2.row = i;
                        curitem2.col = Number(s);
                        curitem2.xpos = colPos[s];
                        curitem2.ypos = rowPos[i];
                        curitem.row = i;
                        curitem2.frameind = Math.floor(Math.random() * curitem.frames + 1);
                        curitem2.id = element[0].name + i + "" + s;
                        curitem2.name = element[0].name;
                        allElements.push([element[0].type, curitem, curitem2]);
                    }
                }
            }
        }
        game.state = -1;

        drawbackground();

        /* inject text and img to menue and initial text
        *@ t[string]: identifyer of the html elemnts to be the receivers, can be (init, menue)
        */
        function injectinfo(t){
            $("#"+t+"title").text(curlevel.levelname);
            $("#"+t+"text").text("");
            var tps = curlevel.leveltext.split("#");
            for (var i = 0; i < tps.length; i++) {
                $("#"+t+"text").append("<p>" + tps[i] + "</p>");
            }
            var cha = curlevel.levelcharacter;
            var cha2;
            /* detect where the sprite for levelcharacter can be found in config*/
            if (config[cha]) {
                cha2 = config[cha];
            }
            if (config.enemies[cha]) {
                cha2 = config.enemies[cha];
            }
            if (config.items[cha]) {
                cha2 = config.items[cha];
            }
            var chaobpos = cha2.sprite[Object.keys(cha2.sprite)[0]];
            var chawidth = cha2.width;
            var chaheight = cha2.height;
            $("#"+t+"spriteimg").css({ "background-position": "0 -" + chaobpos + "px", width: chawidth, height: chaheight });
        }
    }

    /* draw and place the unmoveable items / backgrounds of the level*/
    function drawbackground() {
        var col,
            row,
            cheight = (curlevel.rows + 1) * 83 + game.voffset + 3,
            cwidth = (curlevel.cols + 1) * 101,
            centerv = cheight / 2,
            centerh = cwidth / 2;

        $("canvas").each(function (i, obj) {
            obj.width = cwidth;
            obj.height = cheight;
        });

        ctb.beginPath();
        ctb.rect(0, 0, cwidth, cheight);
        ctb.fillStyle = "lightblue";
        ctb.fill();

        game.width = cwidth;
        game.height = cheight;
        game.centerh = centerh;
        game.centerv = centerv;
        game.cols = curlevel.cols;
        game.rows = curlevel.rows;
        for (var row = 0; row <= curlevel.rows; row++) {
            var rt = curlevel.board[row].rowtype;
            var sprite = config.ground[rt].sprite;
            var width = config.ground[rt].width;
            var height = config.ground[rt].height;
            for (var col = 0; col <= curlevel.cols; col++) {
                ctb.drawImage(Resources.get(img), 0, sprite, width, height, colPos[col], rowPos[row] - 50, width, height);
            }
        }

        ctb.drawImage(Resources.get(img), 0, house.sprite["1-0"], house.width, house.height, colPos[house.col], rowPos[house.row] + house.voffset, house.width, house.height);


        reset();
    }

    /* reset all levelspecific variables with changed values, empty the arrays containing the elments and overwrite the player,
    afterwards recreate the player,enemies and items arrays form the original level stored in allelements by call to imtemsinit*/
    function reset() {
        /* split allElements into arrays by element type,emty all element arrays
        */
        var reseter = [allElements.filter(mytype, "player"), allElements.filter(mytype, "enemy"), allElements.filter(mytype, "wood"), allElements.filter(mytype, "item")];
        allEnemies = [];
        allWoods = [];
        allItems = [];
        airens = [];
        groundens = [];

        /*loop through element types*/
        for (var i = 0; i < reseter.length; i++) {
            /*loop through element types> elements*/
            for (var j = 0; j < reseter[i].length; j++) {
                var cu = reseter[i][j];
                /*detect element type, call items init and catch up the callback into player variable or element array*/
                switch (i) {
                case 0:
                    player = itemsinit(cu[0], cu[1], cu[2]);
                    break;
                case 1:
                    var curen = itemsinit(cu[0], cu[1], cu[2]);
                    allEnemies.push(curen);
                    if (cu[2].name === "air") {
                        airens.push(curen);
                    } else {
                        groundens.push(curen);
                    }
                    break;
                case 2:
                    allWoods.push(itemsinit(cu[0], cu[1], cu[2]));
                    break;
                default:
                    allItems.push(itemsinit(cu[0], cu[1], cu[2]));
                }
            }
        }
        /* reset or init level variables, call zoomin animation, resize canvas css to viewport, set cookie */
        game.frame = 1;
        allItems.forEach(function (item) {
            item.getbounds();
        });

        zoomin.initzoom(colPos[curlevel.playerentrycol], rowPos[curlevel.rows], "win");
        if (game.state >= 0) {
            game.state = 0;
        }
        toplift = 0;
        game.levelname = curlevel.levelname;
        game.levbeg = true;
        lastTime = Date.now();
        Cookies.set("game", JSON.stringify(game), { expires: 31 });
        resizecanvas();
        scroll(8);
        main();

        /* detect type of element
        *   @ e[object]: element
        */
        function mytype(e) {
            return e[0] == this;
        }
    }

    /*curent frame detection, levelstate handling ?paused, ?intro, ?running, ?dying, etc set the dt used for calculated rendering*/
    function main() {
        /* calulate dt in millisecods by passed time since last run */
        var now = Date.now();
        var dt = (now - lastTime) / 1000.0;

        /* get the game frame for rendering the elenents*/
        game.frame = game.frame + game.framefactor * dt;

        /*detect the state of gameplay*/
        if (!game.paused && game.init) {
            switch (game.state) {

            case -1:
                /* levelbeginn*/
                game.paused = true;
                maskCtx.fillStyle = zoomin.fillStyle;
                maskCtx.rect(0, 0, game.width, game.height);
                maskCtx.fill();
                $("#pausemenue").foundation("open");
                break;
            case 0:
                /* initzoom*/
                zoomin.update(dt);
                sounds.play(sound.win);
                break;

            case 1:
                /* playing*/
                if (!sounds.playing(sound.win)) {
                    sounds.play(sound.music);
                }
                break;
            case 2:

                break;
            case 3:
                /* outrozoom*/
                zoomout.update(dt);
                sounds.stop(sound.music);
                sounds.play(sound.fail);
                break;
            case 4:
                /* died*/
                if (game.lives > 0) {
                    reset();
                } else {
                    game.state = 5;
                }
                break;
            case 5:
                /* gameover */
                sounds.play(sound.gameover);
                player.dead = false;
                game.levelend = true;
                maskCtx.clearRect(0, 0, game.width, game.height);
                Cookies.remove("game");
                break;
            case 6:
                /* levelwinning */
                sounds.stop(sound.music);
                zoomout.update(dt);
                sounds.play(sound.win);
                break;
            case 7:
                /* levelwon */
                game.points += parseInt(curlevel.levelpoints * game.speed / 100);
                game.level++;
                game.state = 0;
                parselevel();
                break;
            case 8:
                /* gamewon */
                sounds.play(sound.gameover);
                game.won = true;
                maskCtx.clearRect(0, 0, game.width, game.height);
                Cookies.remove("game");
                break;
            }
            if(!player.dead){
                update(dt);
            }
        }
        lastTime = now;
        win.requestAnimationFrame(main);
    }

    /*pitch the following functions ( updateEntities,checkCollisions,renderEntities)
    *   @dt [number]: time passed since last animation
    */
    function update(dt) {

        updateEntities(dt);
        checkCollisions();
        renderEntities();
    }

    /*calculate the next position for all automoving elements
    *    @dt [number]: time passed since last animation
    */
    function updateEntities(dt) {
        allEnemies.forEach(function (enemy) {
            enemy.move(dt);
        });
        allWoods.forEach(function (enemy) {
            enemy.move(dt);
        });
    }

    /*check if enemies have collied, if items are collected, player is on a log, player is dying or has reached the target*/
    function checkCollisions() {

        allEnemies.forEach(function (item) {
            item.getbounds();
        });
        allWoods.forEach(function (item) {
            item.getbounds();
        });
        player.getbounds();

        if (game.state < 4 && !player.dead) {
            /* is player hit by enemy ? */
            var killer = allEnemies.filter(hit, player);
            if (killer.length > 0) {
                player.die();
            }
            /* is player drowing,on log or just left log?*/
            if (curlevel.board[player.row].rowtype === "water" && !player.dead) {
                var isonwood = allWoods.filter(hit, player);
                if (isonwood.length > 0) {
                    player.xpos = isonwood[0].xpos;
                    player.col = Math.floor((player.xpos + player.hoffset * 2) / 101);
                    player.voffset = -26;
                    player.onwood = true;
                } else {
                    player.die();
                }
            } else {
                if (player.onwood) {
                    player.onwood = false;
                    player.xpos = colPos[player.col];
                    player.voffset = config.player.voffset;
                }
            }
            /* is player on item? collect if coins or power, if stone undo last player move calculation*/
            var its = allItems.filter(getits, player);
            if (its.length > 0) {
                for (var i = 0; i < its.length; i++) {
                    switch (its[i].name) {
                    case "stones":
                        sounds.play(sound.stone);
                        player.xpos = player.oldxpos;
                        player.ypos = player.oldypos;
                        player.col = player.oldcol;
                        player.row = player.oldrow;
                        scroll(400);
                        break;
                    case "coins":
                        sounds.play(sound.power);
                        game.points = game.points += game.coinvalue;
                        its[i].xpos = -200;
                        its[i].row = -1;
                        break;
                    case "power":
                        sounds.play(sound.power);
                        its[i].xpos = -200;
                        its[i].row = -1;
                        if (game.lives < game.maxlives) game.lives++;
                        break;
                    }
                }
            }
            /* is player in target? */
            if (player.row === 0 && player.col === house.col) {
                game.state = 6;
                zoomout.initzoom(player.xpos, 101, "win");
            }
        }
        /* are enemies or logs bumped into each other ?*/
        getbumps(groundens);
        getbumps(allWoods);

        /* detect bumping elements of same type with overlaying bounds in a row or elemnt bumped in rock
        *   @ arrin [array] : array of elements to be checked
        */
        function getbumps(arrin) {
            /* find elements with bump on*/
            var arr = arrin.filter(bump);
            /* sort by row and xpos for not mixin up the different rows*/
            arr.sort(function (a, b) {
                return a.row * 2 * game.width + a.xpos - (b.row * 2 * game.width + b.xpos);
            });

            /*loop through bumpable elements*/
            for (var i = 0; i < arr.length; i++) {
                var eni = arr[i];
                /* has elment hit a rock?*/
                var arrb = allItems.filter(blocked, eni);
                if (arrb.length > 0) {
                    /* relocate element outside rock an turn direction*/
                    if (eni.direction > 0) {
                        eni.xpos = arrb[0].xpos - (eni.rightb - eni.leftb) - (eni.rightb - arrb[0].leftb);
                    } else {
                        eni.xpos = arrb[0].rightb + (arrb[0].rightb - eni.leftb);
                    }
                    eni.direction = eni.direction * -1;
                }


                if (i === arr.length - 1) break;
                var enj = arr[i + 1];
                /* has element overlaying bound with "right" neighbour?*/
                if (enj.row === eni.row && eni.leftb < enj.leftb && eni.rightb > enj.leftb) {
                    /* same or different direction for turn on not*/
                    if (eni.direction != enj.direction) {
                        eni.direction = eni.direction * -1;
                        enj.direction = enj.direction * -1;
                    }
                    /* exchange elements speed and relocate "right" neighbour outside element*/
                    var tempspeed = eni.speed;
                    eni.speed = enj.speed;
                    enj.speed = tempspeed;
                    enj.xpos = eni.rightb + (eni.rightb - enj.leftb);
                }
            }
        }

        /* are looked up element and calling element in same row and col?
        *   @ i[object]: looked up elements
        */
        function getits(i) {
            return this.row === i.row && this.col === i.col;
        }

        /*filter function => are looked up element and calling element in same row and are bounds overlaying?
        *   @ en[object]: looked up elements
        */
        function hit(en) {
            return en.row === this.row && (this.leftb < en.leftb && this.rightb > en.leftb || en.leftb < this.leftb && en.rightb > this.leftb);
        }

        /*filter function => are bumps on for these elements?
        *   @ en[object]: looked up elements
        */
        function bump(en) {
            return en.bump;
        }

        /*filter function =>  has elment hit a rock?
        *   @ en[object]: looked up elements
        */

        function blocked(en) {
            return en.name === "stones" && en.row === this.row && (this.leftb < en.leftb && this.rightb > en.leftb || en.leftb < this.leftb && en.rightb > this.leftb);
        }
    }

    /*clear the element render canvas, pitch the render function of the element types ordered by their visual layer bottom up, call showinfo for textanimation*/
    function renderEntities() {
        ctx.clearRect(0, 0, game.width, game.height);
        allItems.forEach(function (item) {
            item.render();
        });

        groundens.forEach(function (item) {
            item.render();
        });

        allWoods.forEach(function (item) {
            item.render();
        });
        player.render();
        airens.forEach(function (item) {
            item.render();
        });
        showinfos();
    }

    /*toggle the pause and hide/show the pausemenue*/
    function togglepause() {
        if (game.init) {
            game.paused = !game.paused;
            if (!game.paused) {
                if (game.state === -1) game.state = 0;
            }
            sounds.mute(game.paused || game.muted);
            $("#pausemenue").foundation("toggle");
        }
    }

    /*resize the canvas and calculate the proportion between the window size and the original canvas size (wich is still used by all on actions on canvas),
     when a new level is parsed or the screensize has changed*/
    function resizecanvas() {
        game.truewidth = $(window).width();
        game.trueheight = game.truewidth / game.width * game.height;
        $(".cans").css({ height: game.trueheight, width: game.truewidth });
        gamerel = game.truewidth / game.width;
        scroll();
    }

    /*scroll the window to the players with offset of two lines below the player*/
    function scroll(speed) {
        var pos = parseInt(game.rows / $("#canback").height() * $(window).height()) - 2;
        $("#allwrap").animate({ scrollTop: parseInt(rowPos[player.row - pos] / game.height * game.trueheight) }, speed);
    }

    /*draw headbar, display the text animation at levelbegin / levelend */
    function showinfos() {
        ctbar.clearRect(0, 0, game.width, 100);

        /* draw the headbar containing points, levelname, lives*/
        if (!game.levbeg) {
            for (var i = 0; i < game.lives; i++) {
                ctbar.font = "25pt Toona";
                ctbar.fillStyle = "#cc0000";
                ctbar.lineWidth = 5;
                ctbar.strokeStyle = "#ffcc00";
                ctbar.textAlign = "left";
                ctbar.strokeText(game.points, 11, 30);
                ctbar.fillText(game.points, 10, 30);
                if (!game.levbeg) {
                    var textwidth = ctbar.measureText(game.levelname).width;
                    ctbar.strokeText(game.levelname, game.width / 2 - textwidth / 2, 30);
                    ctbar.fillText(game.levelname, game.width / 2 - textwidth / 2, 30);
                }
                var heartbeat = Math.floor(game.frame % 5);
                ctbar.drawImage(Resources.get(img), 0, heart.v, heart.w, heart.h, game.width - (i + 1) * 40 - 3, -5, 40 - heartbeat, 50);
            }
        }
        /* call textanimation for levelbeginn, gameover, gamewon */
        if (game.levbeg && game.state > 0) {
            animtext(game.levelname, 2);
            if (toplift > $(window).height() / 3 + 70) {
                game.levbeg = false;
                toplift = 0;
            }
        }

        if (game.levelend) {
            animtext("GAME OVER", 0, "");
        }
        if (game.won) {
            animtext("Congratulations !!!", 0);
        }

        /*draw the text animation
        * @ text [string]: text to be shown
        * @ tofact [integer]: altering of textpostion,zoom; 0 for static text
        */

        function animtext(text, tofact) {
            ctbar.clearRect(0, 0, game.width, $(window).height());
            var ts = 70 + toplift / 2;
            ctbar.font = ts + "pt Toona";
            ctbar.fillStyle = "#cc0000";
            ctbar.lineWidth = 10;
            ctbar.strokeStyle = "#ffcc00";
            toplift += tofact;
            var textwidth = ctbar.measureText(text).width;
            ctbar.strokeText(text, game.width / 2 - textwidth / 2, $(window).height() / 3 - toplift);
            ctbar.fillText(text, game.width / 2 - textwidth / 2, $(window).height() / 3 - toplift);
        }
    }

    /*read the actual location hash and push into the game variable if set
    * @ load [string]: if "load" ; game values will be overwritten
    */
    function gethash(load) {
        hashes = [];
        var has = window.location.hash.substr(1).split("&");
        for (var i = 0; i < has.length; i++) {
            var h = has[i].split("=");
            hashes[h[0]] = h[1];
        }

        if (load === "load") {
            if (hashes.save) {
                var game2 = JSON.parse(window.atob(hashes.save));
                game.lives = game2.lives;
                game.level = game2.level;
                game.muted = game2.muted;
                game.init = game2.init;
                game.speed = game2.speed;
                game.points = game.points;
                sethash("");
            }
            if (hashes.edit) {
                game = JSON.parse(hashes.edit);
                game.loadremotelev = true;
            }
            if (hashes.url) {
                game.url = hashes.url;
                game.loadremotelev = true;
            }
            if (hashes.custom) {
                showedit();
            }
        }
    }

    /*create the new hash for saving editing and url
    * @ myhask : hashto by written, empty for none to be written
    */
    function sethash(myhash) {
        if (myhash) {
            myhash = "#" + myhash;
            if (history.pushState) {
                history.pushState(null, null, myhash);
            } else {
                location.hash = myhash;
            }
        } else {

            if (history.pushState) {
                history.pushState("", document.title, window.location.pathname);
            } else {
                location.hash = myhash;
            }
        }
    }

    /*destroy the cookies, and reload the page for complete reinitiation */
    function refresh() {
        sethash();
        Cookies.remove("game");
        location.reload();
    }

    /* hide/show buttons for edit/urlmode in pausemenue*/
    function showedit(){
        $(".inithide").toggle();
    }

    /* requests fullscreen
    * @ element [html element]: element to be displayed fullsreen
    */
    function requestFullScreen(element) {
        var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;

        if (requestMethod) {
            requestMethod.call(element);
        }
    }
})();
