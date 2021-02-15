import * as tf from '@tensorflow/tfjs';
import {openDB} from 'idb';
import config from '../config';
import {MODEL_CLASSES} from '../model/classes';
import IndexDbHandler from '../util/IndexDbHandler';

const MODEL_PATH = '/model/model.json';
const INDEXEDDB_DB = 'tensorflowjs';
const INDEXEDDB_STORE = 'model_info_store';
const INDEXEDDB_KEY = 'web-model';

export default class ModelClassifier {

    dispose(){
        this.y.dispose();
    }

    async initModel(){
        if (!('indexedDB' in window)) {
            this.model = await this.getSimpleModel();
            return this.model;
        }

        const dbExists = await IndexDbHandler.indexDbExists(INDEXEDDB_KEY);
        if(!dbExists){
            this.model = await tf.loadLayersModel(MODEL_PATH);
            await this.model.save('indexeddb://' + INDEXEDDB_KEY);
        }
        this.model = await tf.loadLayersModel('indexeddb://' + INDEXEDDB_KEY);
    }

    async predict(X){
        if(!this.model)
            await this.initModel();

        this.y = await this.model.predict(X);
        return this.y.data();
    }

    async getSimpleModel(){
        this.model = await tf.loadLayersModel(MODEL_PATH);
    }

    async updateModel(){
        // Get the latest model from the server and refresh the one saved in IndexedDB.
        console.log('Updating the model: ' + INDEXEDDB_KEY);
        this.model = await tf.loadLayersModel(MODEL_PATH);
        await this.model.save('indexeddb://' + INDEXEDDB_KEY);
        return {
            isDownloadingModel: false,
            modelUpdateAvailable: false,
            showModelUpdateAlert: false,
            showModelUpdateSuccess: true
        };
    }

    /**
     * Computes the probabilities of the topK classes given logits by computing
     * softmax to get probabilities and then sorting the probabilities.
     * @param values: logits Tensor representing the logits from MobileNet.
     * @param topK: The number of top predictions to show.
     */
    getTopKClasses(values, topK){
        const valuesAndIndices = [];
        for (let i = 0; i < values.length; i++) {
            valuesAndIndices.push({value: values[i], index: i});
        }
        valuesAndIndices.sort((a, b) => {
            return b.value - a.value;
        });
        const topkValues = new Float32Array(topK);
        const topkIndices = new Int32Array(topK);
        for (let i = 0; i < topK; i++) {
            topkValues[i] = valuesAndIndices[i] ? valuesAndIndices[i].value : 0.0;
            topkIndices[i] = valuesAndIndices[i] ? valuesAndIndices[i].index : 0.0;
        }

        const topClassesAndProbs = [];
        for (let i = 0; i < topkIndices.length; i++) {
            topClassesAndProbs.push({
                className: MODEL_CLASSES[topkIndices[i]],
                probability: (topkValues[i] * 100).toFixed(2)
            });
        }

        return topClassesAndProbs.filter( topClasse => topClasse.probability > 0.0);
    }


    /**
     * TODO:
     * we need to create another component to keep track of the model's changes
     */

    async getModelDataFromDB(){
        // Safe to assume tensorflowjs database and related object store exists.
        // Get the date when the model was saved.
        const db = await openDB(INDEXEDDB_DB, 1, );
        const item = await db.transaction(INDEXEDDB_STORE)
            .objectStore(INDEXEDDB_STORE)
            .get(INDEXEDDB_KEY);
        const dateSaved = new Date(item.modelArtifactsInfo.dateSaved);
        // return this.getModelInfo();

        if (this.modelLastUpdated
            && dateSaved >= new Date(this.modelLastUpdated).getTime()) {
            return {
                modelUpdateAvailable: true,
                showModelUpdateAlert: true,
            };
        }

        return {
            modelUpdateAvailable: false,
            showModelUpdateAlert: false,
        };
    }

    async getModelInfo(){
        await fetch(`${config.API_ENDPOINT}/model_info`, {
            method: 'GET',
        })
            .then(async (response) => {
                await response.json().then((data) => {
                    this.modelLastUpdated = data.last_updated;
                })
                    .catch((err) => {
                        console.log('Unable to get parse model info.');
                    });
            })
            .catch((err) => {
                console.log('Unable to get model info');
            });
    }

}

