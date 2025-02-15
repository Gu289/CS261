export default class Car{
    constructor(x, y, image){
        this.x = x;
        this.y = y;
        this.img = image;
        // if(image){
        //     this.img.src = image
        // }
        this.width = 50;
        this.height = 20;
    }

    move(){
        this.y += 1;
    }

    draw(ctx){
        if(this.img.complete){
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }
    }
}