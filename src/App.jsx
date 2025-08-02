import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app'; // Ini adalah impor yang benar
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'; // signInWithCustomToken dihapus karena tidak digunakan lagi di lingkungan lokal
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';

// Pastikan Tailwind CSS dimuat (asumsi sudah tersedia di lingkungan Anda)
// <script src="https://cdn.tailwindcss.com"></script>

const App = () => {
    // State untuk instance Firebase
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false); // Menandakan apakah otentikasi Firebase sudah siap

    // State untuk data aplikasi
    const [parkingSlots, setParkingSlots] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [vehicleLogs, setVehicleLogs] = useState([]);

    // State untuk navigasi tab
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'reservations', 'vehicleLogs', 'adminAssistant'

    // State untuk modal edit reservasi
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({}); // FIX: Inisialisasi dengan useState({})

    // State untuk kotak pesan notifikasi
    const [showMessage, setShowMessage] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' atau 'error'

    // Inisialisasi Firebase dan Otentikasi
    useEffect(() => {
        // ====================================================================
        // PENTING: GANTI NILAI-NILAI PLACEHOLDER DI BAWAH INI
        // DENGAN KONFIGURASI FIREBASE PROYEK ANDA YANG SEBENARNYA!
        // Anda bisa mendapatkan ini dari Firebase Console -> Project settings -> Your apps -> Pilih aplikasi web Anda.
        // ====================================================================
        const firebaseConfig = {
            apiKey: "AIzaSyB4yKSmidFU5Ow81FeGNIEb_-JlFwK0JkU", // <--- GANTI INI dengan apiKey Anda
            authDomain: "smart-parking-system-tafaiz.firebaseapp.com", // <--- GANTI INI dengan authDomain Anda
            databaseURL: "https://smart-parking-system-tafaiz-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "smart-parking-system-tafaiz", // <--- GANTI INI dengan projectId Anda
            storageBucket: "smart-parking-system-tafaiz.firebasestorage.app", // <--- GANTI INI dengan storageBucket Anda
            messagingSenderId: "208962155522", // <--- GANTI INI dengan messagingSenderId Anda
            appId: "1:208962155522:web:ee6153554d6f145a23e31b", // <--- GANTI INI dengan appId Anda
            measurementId: "G-REP7B1T1KC" // Opsional, tambahkan jika ada dan Anda menggunakannya
        };

        // Untuk lingkungan lokal, kita akan menggunakan projectId sebagai bagian dari jalur koleksi Firestore
        // Ini menggantikan __app_id yang digunakan di lingkungan Canvas.
        const currentAppId = firebaseConfig.projectId;

        try {
            const app = initializeApp(firebaseConfig);
            // getAnalytics(app); // getAnalytics dihapus karena tidak digunakan

            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Listener untuk perubahan status otentikasi
            const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    // Jika tidak ada user yang login, coba login secara anonim.
                    // Di lingkungan lokal, kita akan selalu login anonim secara default
                    // kecuali Anda menambahkan UI login eksplisit (misal email/password).
                    await signInAnonymously(firebaseAuth)
                        .catch(anonError => {
                            console.error("Error signing in anonymously:", anonError);
                            showMessageBox('error', 'Gagal masuk secara anonim. Periksa API Key Firebase Anda.');
                        });
                }
                setIsAuthReady(true); // Tandai otentikasi sudah siap setelah pemeriksaan awal
            });

            return () => unsubscribeAuth(); // Cleanup listener saat komponen unmount
        } catch (error) {
            console.error("Failed to initialize Firebase:", error);
            showMessageBox('error', 'Gagal menginisialisasi Firebase. Periksa konfigurasi Anda.');
        }
    }, []); // Efek ini hanya berjalan sekali saat komponen pertama kali di-mount

    // Listener Data Real-time dari Firestore
    useEffect(() => {
        // Pastikan Firebase sudah terinisialisasi dan otentikasi sudah siap
        if (!db || !isAuthReady || !userId) return;

        // ====================================================================
        // PENTING: SESUAIKAN JALUR KOLEKSI FIREBASE JIKA BERBEDA!
        // Jika aplikasi Android Anda menyimpan data di jalur yang lebih sederhana (misal: `/parkingSlots`),
        // Anda perlu mengubah `artifacts/${currentAppId}/public/data/` menjadi jalur yang sesuai.
        // Contoh: `collection(db, \`parkingSlots\`)`
        // ====================================================================

        // Listener untuk Koleksi Parking Slots
        // Menggunakan currentAppId (projectId) untuk jalur koleksi publik
        const unsubscribeParkingSlots = onSnapshot(collection(db, `artifacts/${currentAppId}/public/data/parkingSlots`), (snapshot) => {
            const slots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setParkingSlots(slots);
        }, (error) => {
            console.error("Error fetching parking slots:", error);
            showMessageBox('error', 'Gagal memuat slot parkir.');
        });

        // Listener untuk Koleksi Reservations
        // Menggunakan currentAppId (projectId) untuk jalur koleksi publik
        const unsubscribeReservations = onSnapshot(collection(db, `artifacts/${currentAppId}/public/data/reservations`), (snapshot) => {
            const res = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReservations(res);
        }, (error) => {
            console.error("Error fetching reservations:", error);
            showMessageBox('error', 'Gagal memuat reservasi.');
        });

        // Listener untuk Koleksi Vehicle Logs (diurutkan berdasarkan timestamp terbaru)
        // Menggunakan currentAppId (projectId) untuk jalur koleksi publik
        const vehicleLogsQuery = query(collection(db, `artifacts/${currentAppId}/public/data/vehicleLogs`), orderBy('timestamp', 'desc'));
        const unsubscribeVehicleLogs = onSnapshot(vehicleLogsQuery, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setVehicleLogs(logs);
        }, (error) => {
            console.error("Error fetching vehicle logs:", error);
            showMessageBox('error', 'Gagal memuat log kendaraan.');
        });

        // Fungsi cleanup untuk menghentikan listener saat komponen unmount
        return () => {
            unsubscribeParkingSlots();
            unsubscribeReservations();
            unsubscribeVehicleLogs();
        };
    }, [db, isAuthReady, userId]); // Efek ini akan dijalankan ulang jika db, isAuthReady, atau userId berubah

    // Fungsi pembantu untuk menampilkan kotak pesan notifikasi
    const showMessageBox = (type, content) => {
        setMessageContent(content);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 3000); // Sembunyikan setelah 3 detik
    };

    // Menangani pengeditan reservasi: mengisi form modal dengan data reservasi yang dipilih
    const handleEditReservation = (reservation) => {
        setSelectedReservation(reservation);
        setEditForm({
            slotId: reservation.slotId,
            plateNumber: reservation.plateNumber,
            // Konversi ISO string ke format yang cocok untuk input datetime-local jika perlu,
            // atau pastikan input datetime-local bisa menerima ISO string langsung
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            status: reservation.status,
        });
        setShowEditModal(true);
    };

    // Menangani perubahan input di form edit
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    // Menyimpan perubahan reservasi ke Firestore
    const handleSaveReservation = async () => {
        if (!db || !selectedReservation) return;

        try {
            // Referensi dokumen reservasi yang akan diupdate
            const reservationRef = doc(db, `artifacts/${currentAppId}/public/data/reservations`, selectedReservation.id);
            await updateDoc(reservationRef, {
                ...editForm,
                // Pastikan format waktu tetap ISO string saat disimpan
                startTime: new Date(editForm.startTime).toISOString(),
                endTime: new Date(editForm.endTime).toISOString(),
            });
            setShowEditModal(false);
            showMessageBox('success', 'Reservasi berhasil diperbarui!');
        } catch (error) {
            console.error("Error updating reservation:", error);
            showMessageBox('error', 'Gagal memperbarui reservasi.');
        }
    };

    // Menangani penghapusan reservasi
    const handleDeleteReservation = async (reservationId) => {
        if (!db) return;

        // Menggunakan window.confirm untuk kesederhanaan.
        // Di aplikasi produksi, ini harus diganti dengan modal konfirmasi kustom.
        if (window.confirm("Apakah Anda yakin ingin menghapus reservasi ini?")) {
            try {
                const reservationRef = doc(db, `artifacts/${currentAppId}/public/data/reservations`, reservationId);
                await deleteDoc(reservationRef);
                showMessageBox('success', 'Reservasi berhasil dihapus!');
            } catch (error) {
                console.error("Error deleting reservation:", error);
                showMessageBox('error', 'Gagal menghapus reservasi.');
            }
        }
    };

    // Fungsi untuk mengisi data dummy (mock data) ke Firestore
    const populateMockData = async () => {
        if (!db || !userId) {
            showMessageBox('error', 'Firebase belum siap atau user ID tidak tersedia.');
            return;
        }

        try {
            // Tambahkan mock parking slots
            const slotsCollection = collection(db, `artifacts/${currentAppId}/public/data/parkingSlots`);
            await Promise.all([
                addDoc(slotsCollection, { name: 'A1', status: 'available' }),
                addDoc(slotsCollection, { name: 'A2', status: 'occupied', vehiclePlate: 'B 1234 CD' }),
                addDoc(slotsCollection, { name: 'B1', status: 'reserved', reservedBy: 'user123', reservationId: 'res001' }),
                addDoc(slotsCollection, { name: 'B2', status: 'unavailable' }),
                addDoc(slotsCollection, { name: 'C1', status: 'available' }),
                addDoc(slotsCollection, { name: 'C2', status: 'occupied', vehiclePlate: 'X 9876 YZ' }),
            ]);

            // Tambahkan mock reservations
            const reservationsCollection = collection(db, `artifacts/${currentAppId}/public/data/reservations`);
            await Promise.all([
                addDoc(reservationsCollection, {
                    userId: 'user123',
                    slotId: 'B1',
                    plateNumber: 'E 5678 FG',
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 3600000).toISOString(), // 1 jam kemudian
                    status: 'confirmed',
                }),
                addDoc(reservationsCollection, {
                    userId: 'user456',
                    slotId: 'C3',
                    plateNumber: 'F 9012 HI',
                    startTime: new Date(Date.now() + 7200000).toISOString(), // 2 jam kemudian
                    endTime: new Date(Date.now() + 10800000).toISOString(), // 3 jam kemudian
                    status: 'pending',
                }),
                addDoc(reservationsCollection, {
                    userId: 'user789',
                    slotId: 'A1',
                    plateNumber: 'G 3456 JK',
                    startTime: new Date(Date.now() - 1800000).toISOString(), // 30 menit lalu
                    endTime: new Date(Date.now() + 1800000).toISOString(), // 30 menit dari sekarang
                    status: 'confirmed',
                }),
            ]);

            // Tambahkan mock vehicle logs
            const vehicleLogsCollection = collection(db, `artifacts/${currentAppId}/public/data/vehicleLogs`);
            await Promise.all([
                addDoc(vehicleLogsCollection, {
                    plateNumber: 'B 1234 CD',
                    timestamp: new Date().toISOString(),
                    eventType: 'entry',
                    slotId: 'A2',
                }),
                addDoc(vehicleLogsCollection, {
                    plateNumber: 'C 5678 EF',
                    timestamp: new Date(Date.now() - 600000).toISOString(), // 10 menit lalu
                    eventType: 'entry',
                    slotId: 'D1',
                }),
                addDoc(vehicleLogsCollection, {
                    plateNumber: 'C 5678 EF',
                    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 menit lalu
                    eventType: 'exit',
                    slotId: 'D1',
                }),
                addDoc(vehicleLogsCollection, {
                    plateNumber: 'G 3456 JK',
                    timestamp: new Date(Date.now() - 1700000).toISOString(), // 28 menit lalu
                    eventType: 'entry',
                    slotId: 'A1',
                }),
            ]);
            showMessageBox('success', 'Data dummy berhasil diisi!');
        } catch (error) {
            console.error("Error populating mock data:", error);
            showMessageBox('error', 'Gagal mengisi data dummy.');
        }
    };

    // Komponen Dashboard
    const Dashboard = () => {
        const totalSlots = parkingSlots.length;
        const availableSlots = parkingSlots.filter(slot => slot.status === 'available').length;
        const occupiedSlots = parkingSlots.filter(slot => slot.status === 'occupied').length;
        const reservedSlots = parkingSlots.filter(slot => slot.status === 'reserved').length;
        const unavailableSlots = parkingSlots.filter(slot => slot.status === 'unavailable').length;

        return (
            <div className="p-6 bg-white rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Ikhtisar Parkir</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-blue-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
                        <p className="text-4xl font-extrabold text-blue-700">{totalSlots}</p>
                        <p className="text-lg text-blue-600">Total Slot</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
                        <p className="text-4xl font-extrabold text-green-700">{availableSlots}</p>
                        <p className="text-lg text-green-600">Tersedia</p>
                    </div>
                    <div className="bg-red-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
                        <p className="text-4xl font-extrabold text-red-700">{occupiedSlots}</p>
                        <p className="text-lg text-red-600">Terisi</p>
                    </div>
                    <div className="bg-yellow-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
                        <p className="text-4xl font-extrabold text-yellow-700">{reservedSlots}</p>
                        <p className="text-lg text-yellow-600">Dipesan</p>
                    </div>
                </div>

                <div className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Rincian Status Slot</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {parkingSlots.map(slot => (
                            <div
                                key={slot.id}
                                className={`p-3 rounded-md text-center shadow-sm
                                    ${slot.status === 'available' ? 'bg-green-50 text-green-800' : ''}
                                    ${slot.status === 'occupied' ? 'bg-red-50 text-red-800' : ''}
                                    ${slot.status === 'reserved' ? 'bg-yellow-50 text-yellow-800' : ''}
                                    ${slot.status === 'unavailable' ? 'bg-gray-50 text-gray-800' : ''}
                                `}
                            >
                                <p className="font-semibold text-lg">{slot.name}</p>
                                <p className="text-sm capitalize">{slot.status}</p>
                                {slot.vehiclePlate && <p className="text-xs text-gray-600">{slot.vehiclePlate}</p>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-8 text-center">
                    <button
                        onClick={populateMockData}
                        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Isi Data Dummy (jika kosong)
                    </button>
                </div>
            </div>
        );
    };

    // Komponen Daftar Reservasi
    const ReservationsList = () => {
        return (
            <div className="p-6 bg-white rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Reservasi Parkir</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-6 text-left">ID Reservasi</th>
                                <th className="py-3 px-6 text-left">ID Pengguna</th>
                                <th className="py-3 px-6 text-left">ID Slot</th>
                                <th className="py-3 px-6 text-left">Nomor Plat</th>
                                <th className="py-3 px-6 text-left">Waktu Mulai</th>
                                <th className="py-3 px-6 text-left">Waktu Selesai</th>
                                <th className="py-3 px-6 text-left">Status</th>
                                <th className="py-3 px-6 text-center">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm font-light">
                            {reservations.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-4 text-center text-gray-500">Tidak ada reservasi ditemukan.</td>
                                </tr>
                            ) : (
                                reservations.map(res => (
                                    <tr key={res.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-6 text-left whitespace-nowrap">{res.id}</td>
                                        <td className="py-3 px-6 text-left">{res.userId}</td>
                                        <td className="py-3 px-6 text-left">{res.slotId}</td>
                                        <td className="py-3 px-6 text-left">{res.plateNumber}</td>
                                        <td className="py-3 px-6 text-left">{new Date(res.startTime).toLocaleString()}</td>
                                        <td className="py-3 px-6 text-left">{new Date(res.endTime).toLocaleString()}</td>
                                        <td className="py-3 px-6 text-left">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold
                                                ${res.status === 'confirmed' ? 'bg-green-200 text-green-800' : ''}
                                                ${res.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : ''}
                                                ${res.status === 'completed' ? 'bg-blue-200 text-blue-800' : ''}
                                                ${res.status === 'cancelled' ? 'bg-red-200 text-red-800' : ''}
                                            `}>
                                                {res.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            <div className="flex item-center justify-center space-x-2">
                                                <button
                                                    onClick={() => handleEditReservation(res)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md text-xs shadow-sm transition duration-200"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReservation(res.id)}
                                                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md text-xs shadow-sm transition duration-200"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Komponen Log Kendaraan
    const VehicleLog = () => {
        return (
            <div className="p-6 bg-white rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Log Masuk/Keluar Kendaraan</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-6 text-left">ID Log</th>
                                <th className="py-3 px-6 text-left">Nomor Plat</th>
                                <th className="py-3 px-6 text-left">Timestamp</th>
                                <th className="py-3 px-6 text-left">Jenis Acara</th>
                                <th className="py-3 px-6 text-left">ID Slot</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm font-light">
                            {vehicleLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-4 text-center text-gray-500">Tidak ada log kendaraan ditemukan.</td>
                                </tr>
                            ) : (
                                vehicleLogs.map(log => (
                                    <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-6 text-left whitespace-nowrap">{log.id}</td>
                                        <td className="py-3 px-6 text-left">{log.plateNumber}</td>
                                        <td className="py-3 px-6 text-left">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="py-3 px-6 text-left">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold
                                                ${log.eventType === 'entry' ? 'bg-blue-200 text-blue-800' : 'bg-purple-200 text-purple-800'}
                                            `}>
                                                {log.eventType}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-left">{log.slotId || 'N/A'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // State untuk interaksi Gemini API
    const [geminiQuery, setGeminiQuery] = useState('');
    const [geminiResponse, setGeminiResponse] = useState('');
    const [isGeminiLoading, setIsGeminiLoading] = useState(false);

    // Komponen Admin Assistant
    const AdminAssistant = () => {
        const handleGeminiQuery = async () => {
            setIsGeminiLoading(true);
            setGeminiResponse(''); // Hapus respons sebelumnya

            // Buat prompt dengan data relevan dari state saat ini
            let prompt = `Sebagai asisten admin sistem parkir pintar, analisis data parkir berikut dan berikan jawaban singkat untuk pertanyaan pengguna. Jika disebutkan reservasi atau nomor plat tertentu, fokuslah pada itu. Sarankan tindakan administratif yang potensial jika sesuai.

Waktu/Tanggal Saat Ini: ${new Date().toLocaleString()}

Pertanyaan Pengguna: "${geminiQuery}"

--- Data Parkir ---
Slot Parkir:
${parkingSlots.map(s => `- ID: ${s.id}, Nama: ${s.name}, Status: ${s.status}, Kendaraan: ${s.vehiclePlate || 'N/A'}`).join('\n')}

Reservasi:
${reservations.map(r => `- ID: ${r.id}, Pengguna: ${r.userId}, Slot: ${r.slotId}, Plat: ${r.plateNumber}, Mulai: ${new Date(r.startTime).toLocaleString()}, Selesai: ${new Date(r.endTime).toLocaleString()}, Status: ${r.status}`).join('\n')}

Log Kendaraan (10 terbaru):
${vehicleLogs.slice(0, 10).map(l => `- ID: ${l.id}, Plat: ${l.plateNumber}, Acara: ${l.eventType}, Slot: ${l.slotId || 'N/A'}, Timestamp: ${new Date(l.timestamp).toLocaleString()}`).join('\n')}
--- Akhir Data Parkir ---

Berdasarkan di atas, mohon tanggapi pertanyaan pengguna.`;

            try {
                let chatHistory = [];
                chatHistory.push({ role: "user", parts: [{ text: prompt }] });
                const payload = { contents: chatHistory };
                // Di lingkungan lokal, Anda mungkin perlu menyediakan API Key Gemini Anda di sini
                // Atau pastikan Anda memiliki API Key yang diatur sebagai variabel lingkungan
                const apiKey = ""; // Biarkan kosong jika Anda mengandalkan penyediaan otomatis di lingkungan Canvas

                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    setGeminiResponse(text);
                } else {
                    setGeminiResponse('Tidak dapat memperoleh respons dari AI. Coba lagi atau perbaiki pertanyaan Anda.');
                    console.error('Struktur respons Gemini API tidak terduga:', result);
                }
            } catch (error) {
                console.error("Error calling Gemini API:", error);
                setGeminiResponse('Terjadi kesalahan saat menghubungi AI. Silakan coba lagi nanti.');
            } finally {
                setIsGeminiLoading(false);
            }
        };

        return (
            <div className="p-6 bg-white rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Asisten Admin ✨</h2>
                <div className="mb-4">
                    <label htmlFor="gemini-query" className="block text-gray-700 text-sm font-bold mb-2">
                        Tanyakan AI tentang data parkir:
                    </label>
                    <textarea
                        id="gemini-query"
                        className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32 resize-y"
                        placeholder="Contoh: Bagaimana status slot A2? Apakah ada reservasi tertunda untuk besok? Ringkas entri kendaraan terbaru."
                        value={geminiQuery}
                        onChange={(e) => setGeminiQuery(e.target.value)}
                    ></textarea>
                </div>
                <button
                    onClick={handleGeminiQuery}
                    disabled={isGeminiLoading || !geminiQuery.trim()}
                    className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-md shadow-md hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGeminiLoading ? 'Berpikir...' : 'Dapatkan Wawasan ✨'}
                </button>

                {geminiResponse && (
                    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Respons AI:</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{geminiResponse}</p>
                    </div>
                )}
            </div>
        );
    };

    // Modal Edit Reservasi
    const EditReservationModal = () => {
        if (!showEditModal || !selectedReservation) return null;

        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Reservasi</h3>
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveReservation(); }}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="slotId">
                                ID Slot
                            </label>
                            <input
                                type="text"
                                id="slotId"
                                name="slotId"
                                value={editForm.slotId || ''}
                                onChange={handleFormChange}
                                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="plateNumber">
                                Nomor Plat
                            </label>
                            <input
                                type="text"
                                id="plateNumber"
                                name="plateNumber"
                                value={editForm.plateNumber || ''}
                                onChange={handleFormChange}
                                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startTime">
                                Waktu Mulai
                            </label>
                            <input
                                type="datetime-local"
                                id="startTime"
                                name="startTime"
                                // Konversi ISO string ke format yang cocok untuk input datetime-local
                                value={editForm.startTime ? new Date(editForm.startTime).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, startTime: new Date(e.target.value).toISOString() }))}
                                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endTime">
                                Waktu Selesai
                            </label>
                            <input
                                type="datetime-local"
                                id="endTime"
                                name="endTime"
                                // Konversi ISO string ke format yang cocok untuk input datetime-local
                                value={editForm.endTime ? new Date(editForm.endTime).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, endTime: new Date(e.target.value).toISOString() }))}
                                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
                                Status
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={editForm.status || ''}
                                onChange={handleFormChange}
                                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Selesai</option>
                                <option value="cancelled">Dibatalkan</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between">
                            <button
                                type="submit"
                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200"
                            >
                                Simpan Perubahan
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200"
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // Komponen Kotak Pesan Notifikasi
    const MessageBox = () => {
        if (!showMessage) return null;
        return (
            <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white z-50
                ${messageType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
            >
                {messageContent}
            </div>
        );
    };

    // Tampilan loading saat otentikasi belum siap
    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-lg font-semibold text-gray-700">Memuat panel admin...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-inter antialiased flex flex-col">
            {/* Header dan Navigasi */}
            <header className="bg-white shadow-md py-4 px-6">
                <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-4 sm:mb-0">Admin Parkir Pintar</h1>
                    <nav>
                        <ul className="flex flex-wrap justify-center sm:justify-start space-x-2 sm:space-x-4">
                            <li>
                                <button
                                    onClick={() => setActiveTab('dashboard')}
                                    className={`px-4 py-2 rounded-md font-medium transition duration-300
                                        ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}
                                    `}
                                >
                                    Dashboard
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab('reservations')}
                                    className={`px-4 py-2 rounded-md font-medium transition duration-300
                                        ${activeTab === 'reservations' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}
                                    `}
                                >
                                    Reservasi
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab('vehicleLogs')}
                                    className={`px-4 py-2 rounded-md font-medium transition duration-300
                                        ${activeTab === 'vehicleLogs' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}
                                    `}
                                >
                                    Log Kendaraan
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab('adminAssistant')}
                                    className={`px-4 py-2 rounded-md font-medium transition duration-300
                                        ${activeTab === 'adminAssistant' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}
                                    `}
                                >
                                    Asisten Admin ✨
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            {/* Area Konten Utama */}
            <main className="flex-grow container mx-auto p-6 mt-6">
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'reservations' && <ReservationsList />}
                {activeTab === 'vehicleLogs' && <VehicleLog />}
                {activeTab === 'adminAssistant' && <AdminAssistant />}
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-4 text-center text-sm">
                <p>&copy; {new Date().getFullYear()} Sistem Parkir Pintar. Semua Hak Dilindungi.</p>
                {userId && <p>ID Pengguna Admin: {userId}</p>}
            </footer>

            {/* Modal dan Kotak Pesan */}
            <EditReservationModal />
            <MessageBox />
        </div>
    );
};

export default App;
