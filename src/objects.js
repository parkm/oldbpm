define(['bpm', 'res', 'gfx', 'input', 'events'], function(bpm, res, gfx, input, events) {

    var getID;
    (function() {
        var counter = 0;
        getID = function() {
            return 'o' + counter++;
        };
    })();

    var BasicObject = createClass(events.EventHandler, function() {
        this.state = null;
        this.id = getID();
    }, {
        init: function(state) {
            this.state = state;
        },

        destroy: function() {
            this.state = null;
        },

        update: function(delta) {

        },
    });

    var GameObject = createClass(BasicObject, function() {
        this.idList = [];
        this.displayObjects = [];

        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.angle = 0;
        this.scale = {
            x: 1,
            y: 1
        };
        this.anchor = {
            x: 0.5,
            y: 0.5
        };
        this.syncDisplayProperties = true; // If true this will update all display object's position properties (x,y,scale,rotation) to this object's properties.
    }, {
        init: function(state) {
            BasicObject.prototype.init.call(this, state);
        },

        destroy: function() {
            while (this.displayObjects.length > 0) {
                this.removeDisplay(this.displayObjects[0]);
            }
            BasicObject.prototype.destroy.call(this);
        },

        update:  function(delta) {
            BasicObject.prototype.update.call(this);
            if (this.syncDisplayProperties) {
                this.updateDisplayProperties(this.displayObjects);
            }
        },

        updateDisplayProperties: function(objects, props) {
            var propsDefined = (props !== undefined);
            var defaults = {
                position: true,
                rotation: true,
                anchor: true,
                scale: true,
            };

            // If properties are defined then merge the defaults with them. Otherwise just make them the defaults.
            if (propsDefined) {
                _.defaults(props, defaults);
            } else {
                props = defaults;
            }

            for (var i=0; i<objects.length; ++i) {
                var obj = objects[i];

                var sync; // A display object can specify to sync certain properties. If props were specified then it will override syncGameObjectProperties.
                if (propsDefined || obj.syncGameObjectProperties === undefined) {
                    sync = props;
                } else {
                    sync = _.defaults(obj.syncGameObjectProperties, defaults);
                }

                if (sync.position) {
                    obj.position.x = this.x;
                    obj.position.y = this.y;
                }

                if (sync.rotation) {
                    obj.rotation = -this.angle;
                }

                if (sync.anchor && obj.anchor) {
                    obj.anchor.x = this.anchor.x;
                    obj.anchor.y = this.anchor.y;
                }

                if (sync.scale) {
                    obj.scale.x = this.scale.x;
                    obj.scale.y = this.scale.y;
                }
            }
        },

        addDisplay: function(display, container) {
            this.displayObjects.push(display);
            return this.state.addDisplay(display, container);
        },

        removeDisplay: function(display) {
            this.displayObjects.splice(this.displayObjects.indexOf(display), 1);
            return this.state.removeDisplay(display);
        },

        addId:  function(id) {
            if (typeof id === 'string') {
                if (!this.hasId(id)) {
                    this.idList.push(id);
                }
            } else if (id instanceof Array) {
                for (var i=0; i<id.length; ++i) {
                    this.addId(id[i]);
                }
            }
        },

        hasId:  function(id) {
            if (typeof id === 'string') {
                for (var i=0; i<this.idList.length; ++i) {
                    if (this.idList[i] === id) {
                        return true;
                    }
                }
            } else if (id instanceof Array) {
                for (var i=0; i<id.length; ++i) {
                    if (!this.hasId(id[i])) {
                        return false;
                    }
                }

                if (id.length >= 1) {
                    return true;
                }
            }
            return false;
        },

        removeId:  function(id) {
            if (typeof id === 'string') {
                if (this.hasId(id)) {
                    this.idList.splice(this.idList.indexOf(id), 1);
                }
            } else if (id instanceof Array) {
                for (var i=0; i<id.length; ++i) {
                    this.removeId(id[i]);
                }
            }
        },

        getBounds:  function() {
            var width = this.width * this.anchor.x;
            var height = this.height * this.anchor.y;
            return {
                x1: this.x - width,
                y1: this.y - height,
                x2: this.x + width,
                y2: this.y + height,
            };
        },

        // Returns true if an object is colliding with this object.
        isColliding: function(obj) {
            var bounds = this.getBounds();
            var objBounds = obj.getBounds();

            return (bounds.x1 < objBounds.x2
            && bounds.x2 > objBounds.x1
            && bounds.y1 < objBounds.y2
            && bounds.y2 > objBounds.y1);
        },

        /* Returns the first object which collides with this object.
         * If 'opt' is an object array then it will loop through it rather than the state object list.
         * If 'opt' is undefined or an id then it will loop through the state object list.
         * If 'opt' is an object literal then you can specify id, objects, and grouped.
         * If 'grouped' is true then it will return a list of objects which collide with this object. */
        getCollisions:  function(opt) {
            var id;
            var objects = this.state.objects;
            var grouped = false;

            // Decide what id, objects, and grouped should be based on parameter.
            if (_.isArray(opt)) {
                objects = opt;
            } else {
                if (_.isString(opt)) {
                    id = opt;
                } else {
                    _.defaults(opt, {
                        id: null,
                        objects: objects,
                        grouped: grouped,
                    });

                    id = opt.id;
                    objects = opt.objects;
                    grouped = opt.grouped;
                }
            }

            var result = [];
            for (var i=0; i<objects.length; ++i) {
                var obj = objects[i];
                if (obj instanceof GameObject && obj !== this) {
                    var checkingObj;

                    if (id) {
                        if (obj.hasId(id)) {
                            checkingObj = obj;
                        } else {
                            continue;
                        }
                    } else {
                        checkingObj = obj;
                    }

                    if (this.isColliding(checkingObj)) {
                        result.push(checkingObj);
                        if (!grouped) break;
                    }
                }
            }
            return result.length > 1 ? result : result[0];
        },
    });


    // Any performance problems with these are mostly likely due to the collisions rather than rendering.
    var Bullet = createClass(GameObject, function(tex, x, y, angle) {
        this.x = x;
        this.y = y;
        this.speedX = Math.cos(angle);
        this.speedY = -Math.sin(angle);
        this.tex = tex;

        // Elements
        this.currentElement;
        this.fireStats = {
            damage: 0.01,
            duration: 1200
        };

        this.iceStats = {

        };

        this.lightningStats = {

        };
    }, {
        init: function(state) {
            GameObject.prototype.init.call(this, state);

            this.graphic = this.addDisplay(new gfx.pixi.Sprite(this.tex), this.state.bulletBatch);
            this.width = this.graphic.width;
            this.height = this.graphic.width;

            this.speed = 0;
            this.lifeTime = 0;
            this.lifeTimer = 0;
        },

        destroy: function(state) {
            GameObject.prototype.destroy.call(this, state);
        },

        update: function(delta) {
            GameObject.prototype.update.call(this, delta);
            var speed = this.speed * delta;
            this.x += this.speedX * speed;
            this.y += this.speedY * speed;

            this.angle = -Math.atan2(this.speedY, this.speedX);

            this.lifeTimer -= delta;

            // y = sqrt(1 -x) + x/4
            var lifeRatio = this.lifeTimer / this.lifeTime;
            this.graphic.alpha = Math.sqrt(lifeRatio) + (1-lifeRatio)/4;

            if (this.lifeTimer <= 0) {
                this.state.remove(this);
            }

            var bounds = this.getBounds();
            if (bounds.x1 <= 0 || bounds.x2 >= gfx.width) {
                this.speedX = -this.speedX;
            }

            if (bounds.y1 <= 0 || bounds.y2 >= gfx.height) {
                this.speedY = -this.speedY;
            }

            var collisions = this.getCollisions('bubble');
            for (var i=0; i<collisions.length; ++i) {
                this.onBubbleCollision(collisions[i]);
                collisions[i].onBulletCollision(this);
            }
        },

        onBubbleCollision: function(bubble) {
            switch(this.currentElement) {
                case 'fire':
                    console.log('applying fire to bubble');
                    bubble.applyFire(this.fireStats);
                    console.log(bubble);
                    break;

                case 'ice':
                    bubble.applyIce(this.iceStats);
                    break;

                case 'lightning':
                    bubble.applyLightning(this.lightningStats);
                    break;
            }
        },
    });

    // Shooter applies the element and upgrades onto the bullets it generates
    // Also controls ammo reloading system + graphics
    var Shooter = createClass(GameObject, function() {}, {
        init: function(state) {
            GameObject.prototype.init.call(this, state);
            this.x = gfx.width/2;
            this.y = gfx.height/1.2;
            this.graphic = this.addDisplay(new gfx.pixi.Sprite(res.tex.arrow));
            this.graphic.depth = gfx.layers.gui;

            this.currentElement = bpm.player.currentElement;

            this.ammo = 100;
            this.ammoMax = 1000;
            bpm.player.ammoMax = this.ammoMax;

            this.ammoText = this.state.addDisplay(new gfx.pixi.Text('', {
                stroke: 'black',
                strokeThickness: 4,
                fill: 'white',
                align: 'left',
            }));
            this.ammoText.anchor.x = 0.5;
            this.ammoText.x = this.x;
            this.ammoText.y = this.y + 10;
            this.ammoText.depth = gfx.layers.gui;

            this.ammoLoader = this.state.addDisplay(new gfx.pixi.Graphics());
            this.ammoLoader.depth = gfx.layers.gui;

            this.ammoTimer = this.state.add(new Timer(3000, 'loop', _.bind(function() {
                bpm.player.ammo++;
            }, this)));
        },

        update: function(delta) {
            GameObject.prototype.update.call(this);
            this.angle = -Math.atan2(input.mouse.getY() - this.y, input.mouse.getX() - this.x);

            this.ammoText.setText(this.ammo);

            if (this.ammo > 0) {
                if (input.mouse.isPressed(input.MOUSE_LEFT)) {
                    // bullets can be an array of bullets or just a single bullet
                    var bullets = this.shoot();
                    this.ammo--;
                }
            }

            if (this.ammo < this.ammoMax) {
                this.ammoTimer.paused = false;

                this.ammoLoader.visible = true;
                this.ammoLoader.clear();
                this.drawAmmoLoaderCircle(0, 1);
                this.drawAmmoLoaderCircle(0x67575e, 1 - (this.ammoTimer.currentTime / this.ammoTimer.duration));
            } else {
                this.ammoTimer.paused = true;
                this.ammoLoader.visible = false;
            }

            bpm.player.ammo = this.ammo;
        },

        drawAmmoLoaderCircle: function(color, ratio) {
            this.ammoLoader.lineStyle(8, color, 1);
            var y = this.ammoText.y + this.ammoText.height/2;
            for (var i=0; i<ratio*180; ++i) {
                var rad = i * DEG2RAD;
                this.ammoLoader.lineTo(this.x + (-Math.cos(rad) * 48),  y + (Math.sin(rad) * 32));
            }
        },

        // Called immediately after shoot
        setElement: function(element) {
            var accepts = ['fire', 'ice', 'lightning'];
            if (!_.contains(accepts, element))
                throw new Error('Shooter.setElement: Invalid element passed: ' + element);

            this.currentElement = element;
            bpm.player.currentElement = element;
        },

        // calls spawnBullet with additional functionality
        shoot: function() {},
        // creates and returns a customized instance of Bullet
        // make sure the returned bullet of this function is used in children's invocations
        spawnBullet: function(tex, x, y, angle) {
            var b = new Bullet(tex, x, y, angle);
            if (this.currentElement)
                b.currentElement = this.currentElement;
            return b;
        }
    });

    var PinShooter = createClass(Shooter, function() {}, {
        spawnBullet: function(x, y, angle) {
            var b = Shooter.prototype.spawnBullet.call(this, res.tex.pin, x, y, angle);
            b.init = function(state) {
                Bullet.prototype.init.call(b, state);
                b.speed = 0.2;
                b.lifeTime = 6000;
                b.lifeTimer = b.lifeTime;
            };

            b.destroy = function(state) {
                state.pinEmitter.emit(b.x, b.y, 3);
                Bullet.prototype.destroy.call(b, state);
            };

            return b;
        },

        shoot: function() {
            return this.state.add(this.spawnBullet(this.x, this.y, this.angle));
        },
    });

    var Shotgun = createClass(Shooter, function() {}, {
        spawnBullet: function(x, y, angle) {
            var b = Shooter.prototype.spawnBullet.call(this, res.tex.shotgunBullet, x, y, angle);
            b.init = function(state) {
                Bullet.prototype.init.call(b, state);
                b.speed = 0.25;

                b.lifeTime = 6000;
                b.lifeTimer = b.lifeTime;
            };

            return b;
        },
        shoot: function() {
            var bulletOffset = 15 * DEG2RAD;
            return this.state.add([new ShotgunBullet(this.x, this.y, this.angle),
                                   new ShotgunBullet(this.x, this.y, this.angle+bulletOffset),
                                   new ShotgunBullet(this.x, this.y, this.angle-bulletOffset)]);
        }
    });

    var Rifle = createClass(Shooter, function() {}, {
        spawnBullet: function(x, y, angle) {
            var b = new Bullet(this, res.tex.rifleBullet, x, y, angle);
            b.init = function(state) {
                Bullet.prototype.init.call(b, state);
                b.speed = 0.6;

                b.lifeTime = 6000;
                b.lifeTimer = b.lifeTime;
            };

            return b;
        },

        shoot: function() {
            return this.state.add(new RifleBullet(this.x, this.y, this.angle));
        }
    });


    var Bubble = createClass(GameObject, function(armor, x, y, angle) {
        this.x = x;
        this.y = y;

        this.speedX = Math.cos(angle * DEG2RAD);
        this.speedY = 1;

        this.worth = 10;

        // Armor settings
        // armor protects bubbles from hits while > 0
        this._maxArmor = 9;
        if (_.isNumber(armor)) {
            if (armor < 0)
                armor = 0;
            if (armor > this._maxArmor)
                armor = this._maxArmor;
            this.armor = armor;
        } else {
            warn('Bubble armor is not a number');
        }
        this._prevArmor = this.armor;
    }, {
        init: function(state) {
            GameObject.prototype.init.call(this, state);

            this.state.bubbles.push(this);

            // Graphics / 2D Specs
            this.addId('bubble');
            this.bubble = new gfx.pixi.Sprite(res.tex.bubble);
            this.glare = new gfx.pixi.Sprite(res.tex.glare);

            this.width = this.bubble.width;
            this.height = this.bubble.width;

            // Stats affected by upgrades/etc
            this.hpMax = this.armor*2;
            this.hp = this.hpMax;
            this.speed = 0.03;


            // Armor
            if (this.armor > 0) {
                this.armorGraphic = this.addDisplay(new gfx.pixi.Sprite(res.sheets.armor[this.armor-1]), this.armorBatch);
                this.armorStatus = 'normal';

                this.crack = new gfx.pixi.MovieClip(res.sheets.cracks);
                this.crack.anchor.x = this.crack.anchor.y = 0.5;
                this.crack.animationSpeed = 0;
                this.crack.play();
            } else {
                // If not armored initially, set armorGraphic to null
                this.armorGraphic = null;
                this.armorStatus = null;
                this.addBubbleDisplays();
            }
        },

        destroy: function() {
            this.state.bubbleEmitter.emit(this.x, this.y, 10);
            this.state.bubbles.splice(this.state.bubbles.indexOf(this), 1);
            GameObject.prototype.destroy.call(this);
        },

        update: function(delta) {
            GameObject.prototype.update.call(this);

            var speed = this.speed * delta;
            this.x += this.speedX * speed;
            this.y += this.speedY * speed;

            var bounds = this.getBounds();
            if (bounds.x1 <= 0 || bounds.x2 >= gfx.width) {
                this.speedX = -this.speedX;
            }

            if (bounds.y1 >= gfx.height) {
                this.state.remove(this);
            }


            this._updateElements();

            // Death/Armor Management
            if (this.armor > 0) {
                if (this.hp < this.hpMax) {
                    // Add crack effect on first bullet collision.
                    if (this.armorStatus === 'normal') {
                        this.armorGraphic.addChild(this.crack);
                        this.armorStatus = 'damaged';
                    }
                }

                // Remove armor and crack effect. Add bubble displays.
                if (this.hp <= 0) {
                    if (this.armorStatus === 'damaged') {
                        this.removeDisplay(this.armorGraphic);
                        this.addBubbleDisplays();
                        this.armorStatus = null;
                    }
                }
            }

            if (this.hp <= -1) {
                this.state.xp += this.worth * this.state.multiplier;
                this.state.combo++;
                this.state.comboTimer = this.state.comboTime;
                this.state.triggerEvent('bubblePopped');
                this.state.remove(this);
            } else {
                if (this.crack) {
                    this.crack.currentFrame = Math.round((1 - (this.hp / this.hpMax)) * (this.crack.totalFrames-1));
                }
            }
        },

        onBulletCollision: function(bullet) {
            this.hp--;

            if (this.hp > -1) {
                this.state.remove(bullet);
            }
        },

        // Adds the displays for the raw bubble.
        addBubbleDisplays: function() {
            this.addDisplay(this.bubble, this.state.bubbleBatch);
            this.addDisplay(this.glare, this.state.glareBatch);
            this.updateDisplayProperties([this.bubble, this.glare]);
        },


        // Elements
        // Applied by bullets, anything defined here should be either passed from the pin
        // or should be related to the graphics/dimensions of the bubble
        _updateElements: function() {
            switch(this.currentElement) {
                case 'fire':
                    this.updateFire();
                    break;
            }
        },

        removeElement: function(which) {
            this.currentElement = null;
            this.removeDisplay(which);
        },

        applyFire: function(fireStats) {
            if (this.currentElement !== 'fire') {
                if (!this.fire) {
                    this.fire = new gfx.pixi.MovieClip(res.sheets.fire);
                    this.fire.play();
                    this.fire.animationSpeed = 0.3;

                    this.fire.width = this.width;
                    this.fire.height = this.height;

                    this.fire.syncGameObjectProperties = { scale: false };
                    this.fire.alpha = 0.7;
                    this.fire.depth = -4;
                }

                this.fireStats = fireStats;
                this.addDisplay(this.fire);
                this.currentElement = 'fire';

                var onFireComplete = _.bind(this.removeElement, this, this.fire);
                var fireTimer = new Timer(this.fireStats.duration, 'oneshot', onFireComplete);
                this.state.add(fireTimer);
            }
        },

        updateFire: function() {
            if (this.fireStats) {
                this.hp -= this.fireStats.damage;

            var collidedBubble = this.getCollisions(this.state.bubbles);
            if (collidedBubble) {
                bubble.applyFire(this.fireStats);
            } else {
                warn('Bubble.fireStats not defined!');
            }
        },
    });


    var Particle = createClass(GameObject, function(emitter, tex, opt) {
        this.x = opt.x;
        this.y = opt.y;

        this.speed = opt.speed;
        this.speedX = Math.cos(opt.angle * DEG2RAD);
        this.speedY = -Math.sin(opt.angle * DEG2RAD);

        this.rotationRate = opt.rotationRate;

        this.emitter = emitter;

        this.lifeTime = opt.lifeTime;
        this.lifeTimer = this.lifeTime;

        this.sprite = new gfx.pixi.Sprite(tex);
        this.sprite.anchor.x = 0.5;
        this.sprite.anchor.y = 0.5;
    }, {
        init: function(state) {
            GameObject.prototype.init.call(this, state);
            this.emitter.batch.addChild(this.sprite);
        },

        destroy: function() {
            GameObject.prototype.destroy.call(this);
            this.emitter.batch.removeChild(this.sprite);
        },

        update: function(delta) {
            GameObject.prototype.update.call(this, delta);

            var speed = this.speed * delta;

            this.x += this.speedX * speed;
            this.y += this.speedY * speed;

            this.sprite.alpha = this.lifeTimer / this.lifeTime;
            this.lifeTimer--;
            if (this.state && this.lifeTimer < 0) {
                this.state.remove(this);
            }

            this.sprite.rotation += this.rotationRate;
            this.sprite.position.x = this.x;
            this.sprite.position.y = this.y;
        },
    });

    var Emitter = createClass(GameObject, function(tex, opt) {
        this.setOptions(opt);
        this.texture = tex;
        this.batch = new gfx.pixi.SpriteBatch();
        this.syncDisplayProperties = false;
    }, {
        init: function(state) {
            GameObject.prototype.init.call(this, state);
            this.addDisplay(this.batch);
        },

        setOptions: function(opt) {
            this.angleMin = opt.angleMin;
            this.angleMax = opt.angleMax;

            this.speedMin = opt.speedMin;
            this.speedMax = opt.speedMax;

            this.lifeMin = opt.lifeMin;
            this.lifeMax = opt.lifeMax;

            this.range = opt.range;
            this.minRotationRate = opt.minRotationRate;
            this.maxRotationRate = opt.maxRotationRate;
        },

        emit: function(x, y, amount) {
            if (this.state) {
                for (var i=0; i<amount; ++i) {
                    var particle = new Particle(this, this.texture, {
                        x:        randomRange(x - this.range, x + this.range),
                        y:        randomRange(y - this.range, y + this.range),
                        speed:    randomRange(this.speedMin, this.speedMax),
                        angle:    randomRange(this.angleMin, this.angleMax),
                        lifeTime: randomRange(this.lifeMin, this.lifeMax),
                        rotationRate: randomRange(this.minRotationRate, this.maxRotationRate),
                    });
                    this.state.add(particle);
                }
            }
        },
    });

    // types = oneshot, loop
    var Timer = createClass(BasicObject, function(duration, type, onComplete) {
        this.duration = duration;
        this.currentTime = duration;
        this.onComplete = onComplete;
        this.type = type;
    }, {
        update: function(delta) {
            if (this.paused) return;

            BasicObject.prototype.update.call(this, delta);
            this.currentTime -= delta;

            if (this.onTick) {
                this.onTick(1-(this.currentTime/this.duration), this.currentTime, this.duration);
            }

            if (this.currentTime <= 0) {
                if (this.type === 'oneshot') {
                    this.state.remove(this);
                } else if (this.type === 'loop') {
                    this.currentTime = this.duration;
                }

                if (this.onComplete) {
                    this.onComplete();
                }
            }
        },
    });

    var StatusBar = createClass(GameObject, function(back, front, width, height) {
        this.backSliceTextures = back;
        this.frontSliceTextures = front;
        this.width = width;
        this.height = height;

        Object.defineProperty(this, 'depth', {
            get: function() { return this._depth },
            set: function(val) {
                this._depth = val;
                this.updateDepth = true;
            },
        });
    }, {
        init: function(state) {
            GameObject.prototype.init.call(this, state);
            this.backSlice = new gfx.NineSlice(this.backSliceTextures);
            this.frontSlice = new gfx.NineSlice(this.frontSliceTextures);

            this.backSlice.depth = this.depth+1;
            this.frontSlice.depth = this.depth;

            this.backSlice.width = this.width;
            this.backSlice.height = this.height;

            this.frontSlice.width = this.width;
            this.frontSlice.height = this.height;

            this.addDisplay(this.backSlice);
            this.addDisplay(this.frontSlice);

            this.frontSlice.update();
            this.backSlice.update();
        },

        setRatio: function(ratio) {
            this.ratio = ratio;
            this.updateRatio = true;
        },

        update: function(delta) {
            GameObject.prototype.update.call(this, delta);

            if (this.updateDepth) {
                this.backSlice.depth = this.depth+1;
                this.frontSlice.depth = this.depth;
                this.updateDepth = false;
            }

            if (this.updateRatio) {
                this.frontSlice.update();
                this.backSlice.update();

                this.frontSlice.width = this.ratio * this.width;

                if (this.ratio <= 0.05) { // A slight offset, when the ratio is too small it gets ugly.
                    this.frontSlice.visible = false;
                } else if (!this.frontSlice.visible) {
                    this.frontSlice.visible = true;
                }
                this.updateRatio = false;
            }
        },
    });

    return {
        GameObject: GameObject,
        Timer: Timer,
        //Shooter: Shooter,
        Bubble: Bubble,
        Emitter: Emitter,
        StatusBar: StatusBar,
        PinShooter: PinShooter,
        Rifle: Rifle,
        Shotgun: Shotgun
    };
});
