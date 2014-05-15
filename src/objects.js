define(['bpm', 'res', 'gfx', 'input'], function(bpm, res, gfx, input) {

    var BasicObject = createClass(null, function() {
        this.state = null;
    }, {
        init: function(state) {
            this.state = state;
        },

        destroy: function(state) {
            this.state = null;
        },

        update: function(delta) {

        },
    });

    var GameObject = createClass(BasicObject, function() {
        this.displayObjects = [];
        this.idList = [];

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
            this.state = state;
        },

        destroy: function(state) {
            while (this.displayObjects.length > 0) {
                this.removeDisplay(this.displayObjects[0]);
            }
            this.state = null;
        },

        update:  function(delta) {
            if (this.syncDisplayProperties) {
                for (var i=0; i<this.displayObjects.length; ++i) {
                    var obj = this.displayObjects[i];
                    obj.position.x = this.x;
                    obj.position.y = this.y;
                    obj.rotation = -this.angle;
                    if (obj.anchor) {
                        obj.anchor.x = this.anchor.x;
                        obj.anchor.y = this.anchor.y;
                    }
                    obj.scale.x = this.scale.x;
                    obj.scale.y = this.scale.y;
                }
            }
        },

        addDisplay:  function(display, container) {
            this.displayObjects.push(display);
            return this.state.addDisplay(display, container);
        },

        removeDisplay:  function(display) {
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

        getCollisions:  function(id) {
            var result = [];
            for (var i=0; i<this.state.objects.length; ++i) {
                var obj = this.state.objects[i];
                if (obj !== this && obj.hasId(id)) {
                    var bounds = this.getBounds();
                    var objBounds = obj.getBounds();

                     if (bounds.x1 < objBounds.x2
                      && bounds.x2 > objBounds.x1
                      && bounds.y1 < objBounds.y2
                      && bounds.y2 > objBounds.y1) {
                        result.push(obj);
                    }
                }
            }
            return result;
        },
    });


    var PinShooter = createClass(GameObject, function() {

    }, {
        init: function(state) {
            GameObject.prototype.init.call(this, state);
            this.x = gfx.width/2;
            this.y = gfx.height/2;
            this.graphic = this.addDisplay(new gfx.pixi.Sprite(res.tex.arrow));
            this.graphic.depth = -10;
        },

        update: function(delta) {
            GameObject.prototype.update.call(this);
            this.angle = -Math.atan2(input.mouse.getY() - this.y, input.mouse.getX() - this.x);

            if (bpm.player.pins > 0) {
                if (input.mouse.isPressed(input.MOUSE_LEFT)) {
                    this.state.add(new Pin(this.x, this.y, this.angle));
                    bpm.player.pins--;
                }
            }
        },
    });

    var Pin = createClass(GameObject, function(x, y, angle) {
        this.x = x;
        this.y = y;
        this.speedX = Math.cos(angle);
        this.speedY = -Math.sin(angle);
    }, {
        init: function(state) {
            GameObject.prototype.init.call(this, state);

            this.speed = 0.2;
            this.graphic = this.addDisplay(new gfx.pixi.Sprite(res.tex.pin), state.pinBatch);
            this.width = this.graphic.width;
            this.height = this.graphic.width;

            this.lifeTime = 6000;
            this.lifeTimer = this.lifeTime;
        },

        destroy: function() {
            this.state.pinEmitter.emit(this.x, this.y, 3);
            GameObject.prototype.destroy.call(this);
        },

        update: function(delta) {
            GameObject.prototype.update.call(this);
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
                var obj = collisions[i];
                if (obj.armor > 0) {
                    obj.armor--;
                    this.state.remove(this);
                } else {
                    this.state.remove(obj);
                }
            }
        },
    });


    var Bubble = createClass(GameObject, function(armor, x, y, angle) {
        this.x = x;
        this.y = y;

        var v = angularSpeed(angle || 0);
        this.speedX = v.x;
        this.speedY = v.y;

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

            this.addId('bubble');
            this.speed = 0.03;

            this.graphic = this.addDisplay(new gfx.pixi.Sprite(res.tex.bubble), state.bubbleBatch);
            this.glare = this.addDisplay(new gfx.pixi.Sprite(res.tex.glare), state.glareBatch);

            this.width = this.graphic.width;
            this.height = this.graphic.width;

            // Armor
            this.armorSprites = [null];
            for (var i = 1; i < this.armor + 1; i++) {
                var atex = res.tex['armor'+i];
                this.armorSprites[i] = new gfx.pixi.Sprite(atex);
                this.armorSprites[i].depth = -1;
            }
            // If not armored initially, set armorGraphic to null
            this.armorGraphic = this.armor > 0 ? this.addDisplay(this.armorSprites[this.armor]) : null;
        },

        destroy: function() {
            bpm.player.xp += this.worth;
            this.state.combo++;
            this.state.comboTimer = this.state.comboTime;
            this.state.bubbleEmitter.emit(this.x, this.y, 10);
            GameObject.prototype.destroy.call(this);
        },

        update: function(delta) {
            GameObject.prototype.update.call(this);

            // Armor
            if (!_.isNull(this.armorGraphic) && (this.armor !== this._prevArmor)) {
                this.removeDisplay(this.armorGraphic);
                if (this.armor > 0)
                    this.armorGraphic = this.addDisplay(this.armorSprites[this.armor]);
                this._prevArmor = this.armor;
            }

            var speed = this.speed * delta;
            this.x += this.speedX * speed;
            this.y += this.speedY * speed;

            var bounds = this.getBounds();
            if (bounds.x1 <= 0 || bounds.x2 >= gfx.width) {
                this.speedX = -this.speedX;
            }

            if (bounds.y1 <= 0 || bounds.y2 >= gfx.height) {
                this.speedY = -this.speedY;
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

    var NineSlice = createClass(GameObject, function(slices) {
        this.slices = slices;
        this.sprites = {};

        this._depth = 0;

        Object.defineProperty(this, 'depth', {
            get: function() { return this._depth; },
            set: function(val) {
                this.updateDepth = true;
                this._depth = val;
            },
        });

        Object.defineProperty(this, 'x', {
            get: function() { return this._x; },
            set: function(val) {
                this._x = val;
                this.updatePos = true;
            },
        });

        Object.defineProperty(this, 'y', {
            get: function() { return this._y; },
            set: function(val) {
                this._y = val;
                this.updatePos = true;
            },
        });

        Object.defineProperty(this, 'width', {
            get: function() { return this._width; },
            set: function(val) {
                this._width = val;
                this.updatePos = true;
            },
        });

        Object.defineProperty(this, 'height', {
            get: function() { return this._height; },
            set: function(val) {
                this._height = val;
                this.updatePos = true;
            },
        });

        Object.defineProperty(this, 'visible', {
            get: function() { return this._visible; },
            set: function(val) {
                this._visible = val;
                this.updateVisible = true;
            },
        });

    }, {
        init: function(state) {
            GameObject.prototype.init.call(this, state);

            for (var key in this.slices) {
                this.sprites[key] = new gfx.pixi.Sprite(this.slices[key]);
                this.sprites[key].depth = this.depth;
                this.addDisplay(this.sprites[key]);
            }

            this.updatePositions(this.sprites, this.x, this.y, this.width, this.height);
            this.syncDisplayProperties = false;
            this.a=0; this.b=0;
        },

        update: function(delta) {
            GameObject.prototype.update.call(this, delta);
            if (this.updateDepth) {
                for (var i in this.sprites) {
                    this.sprites[i].depth = this.depth;
                }
                this.updateDepth = false;
            }

            if (this.updateVisible) {
                for (var i in this.sprites) {
                    this.sprites[i].visible = this.visible;
                }
                this.updateVisible = false;
            }

            if (this.updatePos) {
                this.updatePositions(this.sprites, this.x, this.y, this.width, this.height);
                this.updatePos = false;
            }
        },

        setPos: function(sprite, x, y, w, h) {
            sprite.position.x = x;
            sprite.position.y = y;
            sprite.scale.x = w/sprite.texture.width;
            sprite.scale.y = h/sprite.texture.height;
        },

        updatePositions: function(sprites, x, y, w, h) {
            this.setPos(sprites.left, x, y+sprites.topLeft.height, sprites.left.width, h-sprites.topLeft.height);
            this.setPos(sprites.top, x+sprites.topLeft.width, y, w-sprites.topLeft.width, sprites.top.height);
            this.setPos(sprites.right, x+w, y+sprites.topRight.height, sprites.right.width, h-sprites.topRight.height);
            this.setPos(sprites.bottom, x+sprites.bottomLeft.width, y+h, w-sprites.bottomLeft.width, sprites.bottom.height);
            this.setPos(sprites.topLeft, x, y, sprites.topLeft.width, sprites.topLeft.height);
            this.setPos(sprites.topRight, x+w, y, sprites.topRight.width, sprites.topRight.height);
            this.setPos(sprites.bottomRight, x+w, y+h, sprites.bottomRight.width, sprites.bottomRight.height);
            this.setPos(sprites.bottomLeft, x, y+h, sprites.bottomRight.width, sprites.bottomRight.height);
            this.setPos(sprites.center, x+sprites.left.width, y+sprites.top.height, w-sprites.left.width, h-sprites.top.height);
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
            this.backSlice = new NineSlice(this.backSliceTextures);
            this.frontSlice = new NineSlice(this.frontSliceTextures);

            this.backSlice.depth = this.depth+1;
            this.frontSlice.depth = this.depth;

            this.backSlice.x = this.x;
            this.backSlice.y = this.y;

            this.backSlice.width = this.width;
            this.backSlice.height = this.height;

            this.frontSlice.x = this.x;
            this.frontSlice.y = this.y;

            this.frontSlice.width = this.width;
            this.frontSlice.height = this.height;

            state.add(this.backSlice);
            state.add(this.frontSlice);
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
        PinShooter: PinShooter,
        Bubble: Bubble,
        Emitter: Emitter,
        NineSlice: NineSlice,
        StatusBar: StatusBar,
    };
});
