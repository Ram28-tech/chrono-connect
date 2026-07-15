const mongoose = require('mongoose');
const Event = require('./models/Event');
const Registration = require('./models/Registration');

mongoose.connect('mongodb://localhost:27017/eventDB')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Connection error:', err));

const events = [
  { title: "Tech Talk", description: "Insights into AI & ML", date: "2024-06-20" },
  { title: "Coding Marathon", description: "24-hour code sprint", date: "2024-07-01" },
  { title: "Project Expo", description: "Showcase of student projects", date: "2024-07-10" },
  { title: "Robotics Workshop", description: "Hands-on robot building", date: "2024-07-15" },
  { title: "Startup Bootcamp", description: "Build your startup idea", date: "2024-08-01" }
];

const branches = ['CSE', 'ECE', 'IT', 'Civil', 'Mech'];
const years = ['1', '2', '3', '4'];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateRegistrations = (eventId, count) => {
  const regs = [];
  for (let i = 0; i < count; i++) {
    const name = `Student ${Math.floor(Math.random() * 1000)}`;
    regs.push({
      eventId,
      studentName: name,
      email: `${name.toLowerCase().replace(' ', '')}@college.com`,
      phone: '98765' + String(10000 + Math.floor(Math.random() * 89999)),
      year: getRandom(years),
      branch: getRandom(branches)
    });
  }
  return regs;
};

async function seedDatabase() {
  try {
    await Event.deleteMany({});
    await Registration.deleteMany({});
    console.log('Old data cleared');

    const createdEvents = await Event.insertMany(events);
    console.log('Events inserted');

    let allRegistrations = [];

    // Vary number of registrations for realism
    const registrationCounts = [12, 10, 15, 8, 9];

    createdEvents.forEach((event, idx) => {
      allRegistrations.push(...generateRegistrations(event._id, registrationCounts[idx]));
    });

    await Registration.insertMany(allRegistrations);
    console.log('Registrations inserted:', allRegistrations.length);

    mongoose.connection.close();
    console.log('Seeding complete');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
}

seedDatabase();
