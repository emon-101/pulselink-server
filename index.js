const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
require('dotenv').config();

const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running fine');
})



const uri = process.env.MONGO_DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Database collections
    const database = client.db("pulse_link");

    const donationsRequestCollection =  database.collection("donations_request");


    // Donation Request related APIs
    app.post('/api/donation-request', async(req, res) => {
        const donation = req.body;
        const newDonation = {
            ...donation,
            createdAt: new Date()
        }
        const result = await donationsRequestCollection.insertOne(newDonation);
        res.send(result);
    })

    app.get('/api/donation-request', async(req, res) => {
        const { requesterId } = req.query;
        const query = requesterId ? { requesterId } : {};
        const result = await donationsRequestCollection.find(query).toArray();
        res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`App is running on port ${port}`)
})