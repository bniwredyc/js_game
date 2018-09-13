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
        return new Vector(this.x + vector.x, this.y + vector.y);
    }
    times(multiplier) {
        if (typeof multiplier !== 'number') {
            throw new Error('Множитель должен быть числом');
        }
        return new Vector(this.x * multiplier, this.y * multiplier);
    }
}

class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector)) {
            throw new Error('Расположение должно быть типа Vector');
        }
        if (!(size instanceof Vector)) {
            throw new Error('Размер должно быть типа Vector');
        }
        if (!(speed instanceof Vector)) {
            throw new Error('Скорость должна быть типа Vector');
        }
        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }
    get left() {
        return this.pos.x;
    }
    get top() {
        return this.pos.y;
    }
    get right() {
        return this.pos.x + this.size.x;
    }
    get bottom() {
        return this.pos.y + this.size.y;
    }
    get type() {
        return 'actor';
    }
    act() {}
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
        // тут можно упростить
        // если объект левее, правее, выше или ниже заданного,
        // то они не пересеваются
        let distanceX = Math.abs(calculateCenter(this).x - calculateCenter(actor).x);
        let distanceY = Math.abs(calculateCenter(this).y - calculateCenter(actor).y);

        return distanceX < (this.size.x + actor.size.x) / 2 && distanceY < (this.size.y + actor.size.y) / 2;
    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.player = actors.find((actor) => {
            return actor.type === 'player';
        });
        this.height = grid.length;
        // тулу лучше использовать стрелочную функцию
        // можно даже краткую форму с тренарным опретором сравнения
        this.width = grid.reduce(function (maxLength, row) {
            if (row.length > maxLength) {
                return row.length;
            }
            return maxLength;
        }, 0);
        this.status = null;
        this.finishDelay = 1;
    }
    isFinished() {
        return this.status !== null && this.finishDelay < 1;
    }
    actorAt(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Объект должен быть типа Actor');
        }
        // можно использовать краткую форму записи стрелочной функции
        // если аргумент 1, то скобки можно опускать
        return this.actors.find((element) => {
            return actor.isIntersect(element);
        });
    }
    obstacleAt(direction, size) {
        if (!(direction instanceof Vector)) {
            throw new Error('Направление должно быть объектом типа Vector');
        }
        if (!(size instanceof Vector)) {
            throw new Error('Размер должен быть объектом типа Vector');
        }

        // лучше так не писать
        // определите гранци, а потом идите в цикле
        // не меняйте переменные с границами
        let flooredY = Math.floor(direction.y);
        let flooredX = Math.floor(direction.x);

        if (flooredY >= this.grid.length) {
            return 'lava';
        }
        // вместо this.grid[flooredY].length нужно использовать другое поле
        if (flooredY < 0 || flooredX >= this.grid[flooredY].length || flooredX < 0) {
            return 'wall';
        }

        // лучше расчитать все границы,, а потом идти циклами
        for (flooredY; flooredY < direction.y + size.y; flooredY++) {
            for (flooredX; flooredX < direction.x + size.x; flooredX++) {
                // this.grid[flooredY][flooredX] лучше записать в переменную,
                // чтобы 2 раза не писать
                // и я бы убратл !== undefined
                if (this.grid[flooredY][flooredX] !== undefined) {
                    return this.grid[flooredY][flooredX];
                }
            }
        }
    }
    removeActor(actor) {
        // поиск в массиве осуществляется 2 раза
        if (this.actors.indexOf(actor) !== -1) {
            this.actors.splice(this.actors.indexOf(actor), 1);
        }
    }
    noMoreActors(actorType) {
        // проверку того, что в actors нет пустых объектов
        // лучше осуществлять не здесь
        return !this.actors.some((actor) => actor !== undefined && actor.type === actorType);
    }
    playerTouched(obstacle, actor) {
        if (this.status !== null) {
            return;
        }
        if (obstacle === 'lava' || obstacle === 'fireball') {
            this.status = 'lost';
            return;
        }
        if (obstacle === 'coin' && actor.type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(actorsCatalog = {}) {
        this.actorsCatalog = actorsCatalog;
    }
    actorFromSymbol(symbol) {
        // посмотрите внимательно на этот код и подумайте что с ним надо сделать
        let key = Object.keys(this.actorsCatalog).find((element) => {
            if (element === symbol) {
                return true;
            }
        });
        return this.actorsCatalog[key];
    }
    obstacleFromSymbol(symbol) {
        if (symbol === 'x') {
            return 'wall';
        }
        if (symbol === '!') {
            return 'lava';
        }
    }
    createGrid(stringArray) {
        // тут можно использовать краткую форму записи стрелочной функции
        return stringArray.map((string) => {
            return string.split('').map((symbol) => {
                return this.obstacleFromSymbol(symbol);
            });
        });
    }
    createActors(stringArray) {
        return stringArray.reduce((actors, string, y) => {
            string.split('').forEach((symbol, x) => {
                const actorConstructor = this.actorFromSymbol(symbol);
                if (typeof actorConstructor === 'function') {
                    // значение присваивается 1 раз - const
                    let newActor = new actorConstructor(new Vector(x, y));
                    if (newActor instanceof Actor) {
                        actors.push(newActor);
                    }
                }
            });
            return actors;
        }, []);
    }
    parse(stringArray) {
        return new Level(this.createGrid(stringArray), this.createActors(stringArray));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, new Vector(1, 1), speed);
    }
    get type() {
        return 'fireball';
    }
    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }
    handleObstacle() {
        this.speed = this.speed.times(-1);
    }
    act(time, level) {
        if (level.obstacleAt(this.getNextPosition(time), this.size) === undefined) {
            this.pos = this.getNextPosition(time);
        } else {
            this.handleObstacle();
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 3));
        this.startPos = pos;
    }
    handleObstacle() {
        this.pos = this.startPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
        this.startPos = this.pos;
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * 2 * Math.PI;
    }
    get type() {
        return 'coin';
    }
    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }
    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }
    getNextPosition(time) {
        this.updateSpring(time);
        return this.startPos.plus(this.getSpringVector());
    }
    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
    }
    get type() {
        return 'player';
    }
}

const actorDict = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain,
};
const parser = new LevelParser(actorDict);
loadLevels()
    .then((result) => runGame(JSON.parse(result), parser, DOMDisplay)
        .then(() => alert('YOU WON')));
