import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import ExcelJS from "exceljs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const logSchema = new mongoose.Schema({
    coil_number: String,
    operator: String,
    status: String,
    updated_at: { type: Date, default: Date.now }
});

const Log = mongoose.model('Log', logSchema);

app.get('/', (req, res) => res.send('Server Warehouse-2 is running!'));

app.post('/api/logs', async (req, res) => {
    try {
        const { coil_number } = req.body;

        const lastEntry = await Log.findOne({ coil_number }).sort({ updated_at: -1 });

        if (!lastEntry) {
            return res.status(404).json({ status: 'error', message: 'Ошибка: Данного номера нет в реестре!' });
        }
        if (lastEntry.status === 'complete') {
            return res.status(400).json({ status: 'error', message: 'Этот рулон уже имеет статус SET!' });
        }

        const newLog = new Log(req.body);
        await newLog.save();
        res.status(201).json({ status: 'ok' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.get('/api/logs/search', async (req, res) => {
    try {
        const logs = await Log.find({ coil_number: req.query.number }).sort({ updated_at: -1 });
        if (logs.length === 0) return res.status(404).json({ status: 'error', message: 'Не найден' });
        res.json({ status: 'ok', data: logs[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.get('/api/logs/export', async (req, res) => {
    try {
        const { from, to } = req.query;
        let filter = {};

        if (from && to) {
            filter = {
                updated_at: {
                    $gte: new Date(from),
                    $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
                }
            };
        }

        const logs = await Log.find(filter).sort({ updated_at: -1 });

        if (logs.length === 0) {
            return res.status(404).send("Нет данных за выбранный период");
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Отчет');

        worksheet.columns = [
            { header: 'Номер рулона', key: 'coil_number', width: 25 },
            { header: 'Статус',       key: 'status',       width: 20 },
            { header: 'Дата и время', key: 'updated_at',   width: 30 },
        ];

        logs.forEach(log => {
            worksheet.addRow({
                coil_number: log.coil_number,
                status:      log.status === 'complete' ? 'SET (Завершено)' : 'В процессе',
                updated_at:  log.updated_at ? log.updated_at.toLocaleString('ru-RU') : ''
            });
        });

        worksheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Report.xlsx');

        await workbook.xlsx.write(res);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.listen(PORT, () => console.log(`🚀 Server flying on port ${PORT}`));
