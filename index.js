const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { verifyJWT, requireRole } = require('./middleware-auth');
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

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();

   client.connect(()=> {
    console.log('connecting to MongoDB');
   }).catch(console.dir);

    // Database collections
    const database = client.db("pulse_link");

    const donationsRequestCollection =  database.collection("donations_request");
    const usersCollection = database.collection("user");


    // Donation Request related APIs
    app.post('/api/donation-request', verifyJWT, async(req, res) => {
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

    app.get('/api/donation-request/trends', verifyJWT, requireRole('admin'), async(req, res) => {
        const range = ['day', 'week', 'month'].includes(req.query.range)
        ? req.query.range
        : 'day';

        const result = await donationsRequestCollection.aggregate([
            {
                $group: {
                    _id: {
                        $dateTrunc: { date: '$createdAt', unit: range }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    count: 1
                }
            }
        ]).toArray();

        res.send(result);
    })

    app.get('/api/donation-request/:id', async(req, res) => {
        const { id } = req.params;
        const result = await donationsRequestCollection.findOne({
            _id: new ObjectId(id)
        });
        res.send(result);
    })

    app.patch('/api/donation-request/:id', verifyJWT, async(req, res) => {
        const { id } = req.params;
        const updates = req.body;
        const result = await donationsRequestCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );
        res.send(result);
    })

    app.delete('/api/donation-request/:id', verifyJWT, async(req, res) => {
        const { id } = req.params;
        const result = await donationsRequestCollection.deleteOne({
            _id: new ObjectId(id)
        });
        res.send(result);
    })

    // Users related APIs

    app.get('/api/users', verifyJWT, requireRole('admin'), async(req, res) => {
        const { status } = req.query;
        const query = status ? { status } : {};
        const result = await usersCollection.find(query).toArray();
        res.send(result);
    })

    app.patch('/api/users/:id', verifyJWT, requireRole('admin'), async(req, res) => {
        const { id } = req.params;
        const updates = req.body;
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );
        res.send(result);
    })

    // Donor's Related APIs
    app.get('/api/donors/search', async(req, res) => {
        const { bloodGroup, district, upazila } = req.query;
        
        if(!bloodGroup || !district || !upazila) {
            return res.status(400).json({
                error: 'bloodGroup, district, and upazila are all required.'
            });
        }

        const query = {
            role: 'donor',
            status: 'active',
            bloodGroup,
            district,
            upazila,
        };

        const projection = {
            name: 1,
            email: 1,
            image: 1,
            bloodGroup: 1,
            district: 1,
            upazila: 1,
        };

        const donors = await usersCollection.find(query, { projection }).sort({ createdAt: -1 }).toArray();
        res.send(donors);
    })

    // Stats related APIs
    app.get('/api/stats', verifyJWT, requireRole('admin'), async(req, res) => {
        const [totalDonors, totalRequests] = await Promise.all([
            usersCollection.countDocuments({ role: 'donor' }),
            donationsRequestCollection.countDocuments({}),
        ]);
        res.send({ totalDonors, totalRequests });
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);


app.listen(port, () => {
    console.log(`App is running on port ${port}`)
})

module.exports = app;