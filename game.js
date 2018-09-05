'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error('Можно прибавлять к вектору только вектор типа Vector');
        }
        let newVector = new Vector(this.x + vector.x, this.y + vector.y);
        return newVector;
    }
    times(multiplier) {
        if (typeof multiplier !== 'number') {
            throw new Error('Множитель должен быть числом');
        }
        let newVector = new Vector(this.x * multiplier, this.y * multiplier);
        return newVector;
    }
}

class Actor {
    constructor(location = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(location instanceof Vector)) {
            throw new Error('Расположение должно быть типа Vector');
        } else if (!(size instanceof Vector)) {
            throw new Error('Размер должно быть типа Vector');
        } else if (!(speed instanceof Vector)) {
            throw new Error('Скорость должна быть типа Vector');
        }
        this.pos = location;
        this.size = size;
        this.speed = speed;
        this.act = function () {};
        Object.defineProperties(this, {
            'left': {
                value: location.x
            },
            'top': {
                value: location.y
            },
            'right': {
                value: location.x + size.x
            },
            'bottom': {
                value: location.y + size.y
            },
            'type': {
                value: 'actor',  
                writable: true // это свойство должно быть только для чтения - пока не понятно, как в таком случае менять его в зависимости от класса-потомка
            }
        });
    }
    isIntersect(actor) {
        function calculateCenter(actor) {
            return new Vector(actor.pos.x + actor.size.x / 2, actor.pos.y + actor.size.y / 2)
        }

        if (!(actor instanceof Actor)) {
            throw new Error('Объект должен быть типа Actor');
        }
        if (this === actor) {
            return false;
        }
        let distanceX = Math.abs(calculateCenter(this).x - calculateCenter(actor).x);
        let distanceY = Math.abs(calculateCenter(this).y - calculateCenter(actor).y);

        return distanceX < (this.size.x + actor.size.x) / 2 && distanceY < (this.size.y + actor.size.y) / 2;
    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.player = actors[actors.find(function (actor) {
            if (actor.type === 'player') {
                return true
            }
        })];
        this.height = grid.length;
        let maxLength = 0;
        grid.forEach(function (row) {
            if (row.length > maxLength) {
                maxLength = row.length;
            }
        });
        this.width = maxLength;
        this.status = null;
        this.finishDelay = 1;
    }
    isFinished() {
        if (this.status !== null && this.finishDelay < 1) {
            return true;
        }
        return false;
    }
    actorAt(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Объект должен быть типа Actor');
        }
        return this.actors.find(function (element) {
            if (actor.isIntersect(element)) {
                return true;
            }
        });
    }
    obstacleAt(direction, size) {
        if (!(direction instanceof Vector)) {
            throw new Error('Направление должно быть объектом типа Vector');
        }
        if (!(size instanceof Vector)) {
            throw new Error('Размер должен быть объектом типа Vector');
        }
        const newPosition = new Actor(direction, size);
        for (let y = Math.floor(direction.y); y < direction.y + size.y; y++) {
            for (let x = Math.floor(direction.x); x < direction.x + size.x; x++) {
                if (y >= this.grid.length) {
                    return 'lava';
                }
                else if (y < 0 || x >= this.grid[y].length || x < 0) {
                    return 'wall';
                }
                else if (this.grid[y][x] === 'lava') {
                    return 'lava';
                } else if (this.grid[y][x] === 'wall') {
                    console.log(1);
                    return 'wall';
                }
            }
        }
        return undefined;
    }
    removeActor(actor) {
        delete this.actors[this.actors.indexOf(actor)];
    }
    noMoreActors(actorType) {
        for (let i = 0; i < this.actors.length; i++) {
            if (this.actors[i].type === actorType) {
                return false;
            }
        }
        return true;
    }
    playerTouched(obstacle, actor) {
        if (this.status !== null) {
            return;
        }
        if (obstacle === 'lava' || obstacle === 'fireball') {
            this.status = 'lost';
            return;
        } else if (obstacle === 'coin' && actor.type === 'coin') {
            this.removeActor(actor);
            if (noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(actorsCatalog) {
        this.actorsCatalog = actorsCatalog;
    }
    actorFromSymbol(symbol) {
        if (symbol === undefined) {
            return undefined;
        }
        let key = Object.keys(this.actorsCatalog).find(function (element) {
            if (element === symbol) {
                return true;
            }
        });
        if (key === undefined) {
            return undefined;
        } else {
            return this.actorsCatalog[key];
        }
    }
    obstacleFromSymbol(symbol) {
        if (symbol === 'x') {
            return 'wall';
        } else if (symbol === '!') {
            return 'lava';
        } else {
            return undefined;
        }
    }
    createGrid(stringArray) {
        let grid = [];
        stringArray.forEach((string) => {
            let gridRow = string.split('').map((symbol) => {
                return this.obstacleFromSymbol(symbol);
            });
            grid.push(gridRow);
        });
        return grid;
    }
    createActors(stringArray) {
        let actors = [];
        if (this.actorsCatalog !== undefined) {
            stringArray.forEach((string, y) => {
                string.split('').forEach((symbol, x) => {
                    const actorConstructor = this.actorFromSymbol(symbol);
                    if (typeof actorConstructor === 'function' && new actorConstructor(new Vector(x, y)) instanceof Actor) { 
                        console.log(1);
                        actors.push(new actorConstructor(new Vector(x, y)));
                    }
                });
            });
        }
        return actors;
    }
    parse(stringArray) {
        return new Level(this.createGrid(stringArray), this.createActors(stringArray));
    }
}