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
const FormData = require("form-data");

app.post("/upload-attachment/:cardId", upload.single("file"), async (req, res) => {
  const { cardId } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: "Keine Datei hochgeladen." });
  }

  try {
    const form = new FormData();
    form.append("file", req.file.buffer, req.file.originalname); // Datei an FormData anhängen
    form.append("key", TRELLO_KEY);
    form.append("token", TRELLO_TOKEN);

    const response = await axios.post(
      `https://api.trello.com/1/cards/${cardId}/attachments`,
      form,
      {
        headers: {
          ...form.getHeaders(), // Multipart-Header setzen
        },
      }
    );

    res.status(200).json({ message: "Anhang erfolgreich hochgeladen!" });
  } catch (error) {
    console.error("Fehler beim Hochladen des Anhangs:", error.response?.data || error.message);
    res.status(500).json({ message: "Fehler beim Hochladen des Anhangs." });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
