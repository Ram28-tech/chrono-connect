// server.js (updated with correct analytics and registration fix)
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Models
const Event = require('./models/Event');
const Registration = require('./models/Registration');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/eventDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Faculty Routes
app.post('/faculty/create_event', async (req, res) => {
  const { title, date, description } = req.body;
  const newEvent = new Event({ title, date, description });
  await newEvent.save();
  res.redirect('/faculty_dashboard.html');
});

app.get('/faculty/events', async (req, res) => {
  const events = await Event.find({});
  res.json(events);
});

app.delete('/faculty/event/:id', async (req, res) => {
  const { id } = req.params;
  await Event.findByIdAndDelete(id);
  await Registration.deleteMany({ eventId: id });
  res.sendStatus(200);
});

app.put('/faculty/event/:id', async (req, res) => {
  const { title, description, date } = req.body;
  await Event.findByIdAndUpdate(req.params.id, { title, description, date });
  res.sendStatus(200);
});

app.get('/faculty/registrations/:eventId', async (req, res) => {
  const registrations = await Registration.find({ eventId: req.params.eventId });
  res.json(registrations);
});

app.delete('/faculty/registration/:id', async (req, res) => {
  try {
    await Registration.findByIdAndDelete(req.params.id);
    res.status(200).send("Registration deleted");
  } catch (err) {
    res.status(500).send("Error deleting registration");
  }
  
});
app.get('/faculty/total-registrations', async (req, res) => {
  try {
    const count = await Registration.countDocuments({});
    res.json({ total: count });
  } catch (error) {
    console.error('Error fetching total registrations:', error);
    res.status(500).json({ error: 'Failed to fetch total registrations' });
  }
});


// Accurate Analytics
app.get('/faculty/analytics', async (req, res) => {
  try {
    const events = await Event.find({});
    const registrations = await Registration.find({});

    const regCountMap = {};
    for (let reg of registrations) {
      if (!reg.eventId) continue; // Skip invalid entries
      const id = reg.eventId.toString();
      regCountMap[id] = (regCountMap[id] || 0) + 1;
    }

    const eventTitles = events.map(e => e.title);
    const registrationCounts = events.map(e => regCountMap[e._id.toString()] || 0);

    const branchStats = {};
    const yearStats = {};

    registrations.forEach(r => {
      if (r.branch) branchStats[r.branch] = (branchStats[r.branch] || 0) + 1;
      if (r.year) yearStats[r.year] = (yearStats[r.year] || 0) + 1;
    });

    res.json({ eventTitles, registrationCounts, branchStats, yearStats });
  } catch (err) {
    res.status(500).send("Analytics error");
  }
});
const ExcelJS = require('exceljs');
app.get('/faculty/export-all-registrations', async (req, res) => {
  try {
    const registrations = await Registration.find({}).populate('eventId');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('All Registrations');

    worksheet.columns = [
      { header: 'Student Name', key: 'studentName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Branch', key: 'branch', width: 15 },
      { header: 'Event Title', key: 'eventTitle', width: 30 },
      { header: 'Event Date', key: 'eventDate', width: 20 },
    ];

    registrations.forEach(reg => {
      worksheet.addRow({
        studentName: reg.studentName,
        email: reg.email,
        phone: reg.phone,
        year: reg.year,
        branch: reg.branch,
        eventTitle: reg.eventId?.title || 'N/A',
        eventDate: reg.eventId?.date || 'N/A',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=all_registrations.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).send('Error generating Excel file');
  }
});

app.get('/faculty/export-registrations', async (req, res) => {
  try {
    const events = await Event.find({});
    const registrations = await Registration.find({}).populate('eventId');

    const workbook = new ExcelJS.Workbook();

    for (const event of events) {
      const worksheet = workbook.addWorksheet(event.title);

      worksheet.columns = [
        { header: 'Student Name', key: 'studentName', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Branch', key: 'branch', width: 15 },
        { header: 'Event Date', key: 'eventDate', width: 20 }
      ];

      const filteredRegs = registrations.filter(reg => {
        return reg.eventId && reg.eventId._id.toString() === event._id.toString();
      });

      filteredRegs.forEach(reg => {
        worksheet.addRow({
          studentName: reg.studentName,
          email: reg.email,
          phone: reg.phone,
          year: reg.year,
          branch: reg.branch,
          eventDate: event.date
        });
      });

      if (filteredRegs.length === 0) {
        worksheet.addRow({ studentName: 'No registrations yet.' });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=event_wise_registrations.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).send('Error generating Excel file');
  }
  
});

// Student Routes
app.get('/student/events', async (req, res) => {
  const events = await Event.find({});
  res.json(events);
});

app.post('/student/register', async (req, res) => {
  const { event_id, student_name, email, phone, year, branch } = req.body;

  if (!event_id || !student_name || !email || !phone || !year || !branch) {
    return res.status(400).send("All fields are required.");
  }

  const registration = new Registration({
    eventId: new mongoose.Types.ObjectId(event_id),
    studentName: student_name,
    email,
    phone,
    year,
    branch
  });

  await registration.save();
  res.redirect('/student_dashboard.html');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
