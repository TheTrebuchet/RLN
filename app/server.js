const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {Pool} = require('pg');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'user',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'app_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Endpointy API

app.use(express.text());  // Add this to handle raw text payloads

app.post("/get_iupac", async (req, res) => {
  console.log("Received raw body:", req.body);  // Log incoming request

  const molfile = req.body;  // Since we're sending plain text, req.body contains the string directly

  if (!molfile) {
      return res.status(400).json({ error: "No Molfile provided" });
  }

  try {
      const response = await fetch('http://rdkit-server:5000/get_iupac', {
          method: 'POST',
          headers: {
              'Content-Type': 'text/plain',
          },
          body: molfile,
      });

      const data = await response.json();  // Parse JSON response from Flask
      console.log("Received response from RDKit server:", data);

      if (response.ok) {
          return res.json(data);  // Forward the entire JSON to the website
      } else {
          return res.status(500).json({ error: data.error || "Unknown error from RDKit server" });
      }
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
});


// Getting all elements
app.get('/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({message: 'Server error'});
  }
});

// Adding new element
app.post('/items', async (req, res) => {
  const {name, description} = req.body;
  try {
    await pool.query(
        'INSERT INTO items (name, description) VALUES ($1, $2)',
        [name, description]);
    res.status(201).json({message: 'New element'});
  } catch (err) {
    console.error(err);
    res.status(500).json({message: 'Server error'});
  }
});

// Updating element
app.put('/items/:id', async (req, res) => {
  const {id} = req.params;
  const {name, description} = req.body;
  try {
    const result = await pool.query(
        'UPDATE items SET name = $1, description = $2 WHERE id = $3',
        [name, description, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({message: 'Element not found'});
    }

    res.status(200).json({message: 'Updated element'});
  } catch (err) {
    console.error(err);
    res.status(500).json({message: 'Server error'});
  }
});

// Removing element
app.delete('/items/:id', async (req, res) => {
  const {id} = req.params;

  try {
    const result =
        await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({message: 'Element not found'});
    }

    res.status(200).json({message: 'Element deleted'});

  } catch (error) {
    console.error('Error deleting element:', error);
    res.status(500).json({message: 'Server error'});
  }
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
