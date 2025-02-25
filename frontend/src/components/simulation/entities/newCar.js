export default class Car{

    static cardinalReferences = {
        north: 0,
        east: 1,
        south: 2,
        west: 3,
        0: "north",
        1: "east",
        2: "south",
        3: "west"
    }

    constructor(images, spawnCardinal, endCardinal){
        this.spawnCardinal = Car.cardinalReferences[spawnCardinal];
        this.endDirection = Car.cardinalReferences[endCardinal];
    }

}