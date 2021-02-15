import * as tf from '@tensorflow/tfjs';

const IMAGE_SIZE = 224;
const CANVAS_SIZE = 224;

export default class ModelImage {

    constructor() {
        this.image = null;
        this.imageData = null;
        this.resizedImage = null;
    }

    async fitTransform({image, from='canvas', width, height}){
        if(from === 'canvas')
            return this.fitTransformFromCanvas({image, width, height});

        const resized = tf.image.resizeBilinear(image, [IMAGE_SIZE, IMAGE_SIZE]);
        this.resizedImage = await tf.tidy(() => resized.expandDims(0).toFloat().div(127).sub(1));
        return this.resizedImage;
    }

    async fitTransformFromCanvas({image, width, height}){
        this.image = tf.tidy( () => tf.browser.fromPixels(image).toFloat());
        this.imageData = await tf.tidy(() => this.image.expandDims(0).toFloat().div(127).sub(1));
        this.resizedImage = tf.image.resizeBilinear(this.imageData, [IMAGE_SIZE, IMAGE_SIZE]);
        return this.resizedImage;
    }

    async renderImageFromCamera(imageCapture, canvas){
        const tensorData = tf.tidy(() => imageCapture.toFloat().div(255));
        return tf.browser.toPixels(tensorData, canvas);
    }

    async renderImageFromUpload(croppedCanvas, canvas) {
        // Draw thumbnail to UI.
        const context = canvas.getContext('2d');
        const ratioX = CANVAS_SIZE / croppedCanvas.width;
        const ratioY = CANVAS_SIZE / croppedCanvas.height;
        const ratio = Math.min(ratioX, ratioY);
        context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        context.drawImage(croppedCanvas, 0, 0,
            croppedCanvas.width * ratio, croppedCanvas.height * ratio);
    }

    dispose(){
        if(this.image)
            this.image.dispose();
        if(this.imageData)
            this.imageData.dispose();
        if(this.resizedImage)
            this.resizedImage.dispose();
    }

}