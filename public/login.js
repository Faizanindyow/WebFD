// public/login.js

document.addEventListener('DOMContentLoaded', () => {
    // Mendapatkan referensi ke elemen-elemen HTML
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');

    // ==== PENTING: Email admin yang diizinkan (hardcoded di frontend) ====
    // Ganti dengan email admin yang Anda daftarkan di Firebase Authentication
    const ALLOWED_ADMIN_EMAIL = 'adminf@gmail.com';

    // Pastikan form login ada sebelum menambahkan event listener
    if (loginForm) {
        // Menambahkan event listener untuk saat form disubmit
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Mencegah reload halaman

            const email = emailInput.value;
            const password = passwordInput.value;

            // Reset tampilan error
            errorMessage.style.display = 'none';
            errorMessage.textContent = '';

            // Berikan feedback kepada pengguna
            loginButton.disabled = true; // Nonaktifkan tombol
            loginButton.textContent = 'Logging in...'; // Ubah teks tombol

            try {
                // Langkah 1: Autentikasi pengguna menggunakan Firebase Authentication
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user; // Dapatkan objek pengguna yang berhasil login

                // Langkah 2: Verifikasi apakah email pengguna adalah admin yang diizinkan
                if (user.email === ALLOWED_ADMIN_EMAIL) {
                    // Jika email cocok dengan admin yang diizinkan
                    console.log("Admin logged in:", user.email);
                    alert("Login berhasil! Selamat datang di Dashboard Admin.");
                    // Arahkan ke halaman dashboard
                    window.location.href = '/dashboard.html';
                } else {
                    // Jika email tidak cocok, logout user tersebut dari Firebase
                    await auth.signOut();
                    console.warn("User attempted to login with non-admin email:", user.email);
                    errorMessage.textContent = "Akses ditolak. Anda bukan admin.";
                    errorMessage.style.display = 'block';
                    loginButton.disabled = false; // Aktifkan kembali tombol
                    loginButton.textContent = 'Login'; // Kembalikan teks tombol
                }

            } catch (error) {
                // Tangani error yang mungkin terjadi saat proses login
                console.error("Login error:", error.code, error.message);
                loginButton.disabled = false; // Aktifkan kembali tombol
                loginButton.textContent = 'Login'; // Kembalikan teks tombol

                let displayMessage = "Terjadi kesalahan saat login. Mohon coba lagi.";

                // Memberikan pesan error yang lebih spesifik berdasarkan kode error Firebase
                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        displayMessage = "Email atau password salah.";
                        break;
                    case 'auth/invalid-email':
                        displayMessage = "Format email tidak valid.";
                        break;
                    case 'auth/user-disabled':
                        displayMessage = "Akun Anda telah dinonaktifkan.";
                        break;
                    default:
                        // Untuk error lain yang tidak spesifik
                        displayMessage = "Terjadi kesalahan yang tidak terduga. Mohon coba lagi.";
                }
                errorMessage.textContent = displayMessage; // Atur teks pesan error
                errorMessage.style.display = 'block';     // Tampilkan pesan error
            }
        });
    }
});