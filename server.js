const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const upload = multer();
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Trello API-Konfiguration
const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_LIST_ID = process.env.TRELLO_LIST_ID;

// Mapping der Prioritäten auf Label-IDs
const labelMap = {
  "Wichtig": "6131bfef579a6517c2f3f5b0",
  "Sehr wichtig": "6131bfef579a6517c2f3f5c2",
  "Zu gestern!": "6131bfef579a6517c2f3f5c0",
};

// Statische Dateien aus dem Ordner "public" bereitstellen
app.use(express.static(path.join(__dirname, "public")));

// Root-Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route: Karte erstellen
app.post("/create-ticket", async (req, res) => {
  const { name, department, priority, deadline, title, info } = req.body;

  let description = `**Name:** ${name}\n**Abteilung:** ${department}\n**Priorität:** ${priority}\n\n**Details:**\n${info}`;

  try {
    const labelId = labelMap[priority];
    const response = await axios.post(
      `https://api.trello.com/1/cards`,
      {
        idList: TRELLO_LIST_ID,
        name: title,
        desc: description,
        due: deadline || null,
        idLabels: [labelId],
        key: TRELLO_KEY,
        token: TRELLO_TOKEN,
      }
    );

    const cardId = response.data.id;

    res.status(200).json({ message: "Ticket erfolgreich erstellt!", cardId });
  } catch (error) {
    console.error("Fehler beim Erstellen der Karte:", error.response?.data || error.message);
    res.status(500).json({ message: "Fehler beim Erstellen der Karte." });
  }
});

// Route: Datei-Upload
app.post("/upload-attachment/:cardId", upload.single("file"), async (req, res) => {
  const { cardId } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: "Keine Datei hochgeladen." });
  }

  try {
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);
    formData.append("key", TRELLO_KEY);
    formData.append("token", TRELLO_TOKEN);

    const response = await axios.post(
      `https://api.trello.com/1/cards/${cardId}/attachments`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    res.status(200).json({ message: "Anhang erfolgreich hochgeladen!" });
  } catch (error) {
    console.error("Fehler beim Hochladen des Anhangs:", error.response?.data || error.message);
    res.status(500).json({ message: "Fehler beim Hochladen des Anhangs." });
  }
});

// Route: Backlog-Informationen abrufen
app.get("/get-backlog-info", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.trello.com/1/lists/${TRELLO_LIST_ID}/cards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`
    );

    const cards = response.data;

    // Zeitbedarf basierend auf Priorität
    const priorityTimes = {
      "Wichtig": 8,
      "Sehr wichtig": 4,
      "Zu gestern!": 2,
    };

    let totalTime = 0;

    cards.forEach(card => {
      const priorityLabel = card.labels.find(label => Object.values(labelMap).includes(label.id));
      if (priorityLabel) {
        const priority = Object.keys(labelMap).find(key => labelMap[key] === priorityLabel.id);
        totalTime += priorityTimes[priority] || 0;
      }
    });

    res.status(200).json({
      queueCount: cards.length,
      estimatedTime: totalTime,
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Backlog-Informationen:", error.response?.data || error.message);
    res.status(500).json({ message: "Fehler beim Abrufen der Backlog-Informationen." });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
