class IndexDbHandler{

    static instance;
    static getInstance(){
        if(!IndexDbHandler.instance)
            IndexDbHandler.instance = new IndexDbHandler();
        return IndexDbHandler.instance;
    }

    async indexDbExists(index){
        return (await window.indexedDB.databases()).map(db => db.name).includes(index);
    }

}

export default IndexDbHandler.getInstance();