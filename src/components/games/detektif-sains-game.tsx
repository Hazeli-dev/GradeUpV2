
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Microscope,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";

type Question = {
  word: string;
  clue: string;
};

type Category = {
  id: string;
  title: string;
  description: string;
  icon: string;
  questions: Question[];
};

const categories: Category[] = [
  {
    id: "organ",
    title: "Organ Tubuh",
    description: "Kenali bagian dan organ tubuh manusia.",
    icon: "🫀",
    questions: [
      { word: "JANTUNG", clue: "Organ yang memompa darah ke seluruh tubuh." },
      { word: "OTAK", clue: "Pusat pengendali aktivitas tubuh." },
      { word: "LAMBUNG", clue: "Organ yang membantu mencerna makanan." },
      { word: "GINJAL", clue: "Organ yang menyaring darah dan menghasilkan urine." },
      { word: "HATI", clue: "Organ yang membantu menetralisir zat berbahaya." },
      { word: "PARU", clue: "Organ utama untuk pertukaran gas pernapasan." },
      { word: "USUS", clue: "Organ yang berperan dalam penyerapan sari makanan." },
      { word: "KERONGKONGAN", clue: "Saluran yang menghubungkan mulut dengan lambung." },
      { word: "PANKREAS", clue: "Organ yang menghasilkan insulin." },
      { word: "KULIT", clue: "Organ terluar yang melindungi tubuh." },
      { word: "TULANG", clue: "Penyusun rangka yang menopang tubuh." },
      { word: "OTOT", clue: "Jaringan yang membantu tubuh bergerak." },
      { word: "DARAH", clue: "Cairan yang mengangkut oksigen dan nutrisi." },
      { word: "LIDAH", clue: "Organ yang membantu mengecap rasa." },
      { word: "HIDUNG", clue: "Organ untuk mencium bau." },
      { word: "MATA", clue: "Organ untuk melihat." },
      { word: "TELINGA", clue: "Organ untuk mendengar." },
      { word: "KANDUNG KEMIH", clue: "Tempat penampungan urine sementara." },
      { word: "DIAFRAGMA", clue: "Otot utama yang membantu proses pernapasan." },
      { word: "SUMSUM TULANG", clue: "Jaringan di dalam tulang yang menghasilkan sel darah." },
    ],
  },
  {
    id: "respirasi",
    title: "Sistem Pernapasan",
    description: "Pelajari proses dan organ pernapasan.",
    icon: "🫁",
    questions: [
      { word: "INHALASI", clue: "Proses masuknya udara ke paru-paru." },
      { word: "EKSHALASI", clue: "Proses keluarnya udara dari paru-paru." },
      { word: "TRAKEA", clue: "Saluran udara dari laring menuju bronkus." },
      { word: "BRONKUS", clue: "Cabang trakea menuju paru-paru." },
      { word: "BRONKIOLUS", clue: "Cabang kecil dari bronkus." },
      { word: "ALVEOLUS", clue: "Gelembung paru-paru tempat pertukaran gas." },
      { word: "DIAFRAGMA", clue: "Otot yang bergerak saat bernapas." },
      { word: "OKSIGEN", clue: "Gas yang dibutuhkan tubuh untuk respirasi." },
      { word: "KARBON DIOKSIDA", clue: "Gas sisa respirasi yang dikeluarkan tubuh." },
      { word: "FARING", clue: "Persimpangan saluran makanan dan udara." },
      { word: "LARING", clue: "Bagian saluran pernapasan yang mengandung pita suara." },
      { word: "RONGGA HIDUNG", clue: "Tempat udara disaring dan dihangatkan." },
      { word: "SILIA", clue: "Rambut halus yang membantu menyaring kotoran." },
      { word: "PLEURA", clue: "Selaput yang melapisi paru-paru." },
      { word: "VOLUME TIDAL", clue: "Jumlah udara yang masuk atau keluar saat bernapas normal." },
      { word: "VITAL KAPASITAS", clue: "Jumlah udara maksimum yang dapat dikeluarkan setelah menarik napas maksimal." },
      { word: "RESPIRASI", clue: "Proses tubuh memperoleh energi dari zat makanan." },
      { word: "HEMOGLOBIN", clue: "Protein dalam sel darah merah yang mengikat oksigen." },
      { word: "VENTILASI", clue: "Proses keluar masuknya udara paru-paru." },
      { word: "PERNAPASAN", clue: "Proses pertukaran gas dalam tubuh." },
    ],
  },
  {
    id: "pencernaan",
    title: "Sistem Pencernaan",
    description: "Kenali proses pengolahan makanan.",
    icon: "🥗",
    questions: [
      { word: "ENZIM", clue: "Zat yang mempercepat reaksi kimia dalam pencernaan." },
      { word: "AMILASE", clue: "Enzim yang membantu memecah amilum." },
      { word: "PEPSIN", clue: "Enzim lambung yang mencerna protein." },
      { word: "LIPASE", clue: "Enzim yang membantu memecah lemak." },
      { word: "MULUT", clue: "Tempat pertama makanan dicerna." },
      { word: "ESOFAGUS", clue: "Nama lain dari kerongkongan." },
      { word: "PERISTALTIK", clue: "Gerakan otot saluran pencernaan yang mendorong makanan." },
      { word: "EMPEDU", clue: "Cairan yang membantu proses pencernaan lemak." },
      { word: "VILI", clue: "Tonjolan usus halus yang memperluas penyerapan." },
      { word: "USUS HALUS", clue: "Tempat utama penyerapan sari makanan." },
      { word: "USUS BESAR", clue: "Bagian usus yang menyerap air." },
      { word: "REKTUM", clue: "Bagian akhir usus besar sebelum anus." },
      { word: "ANUS", clue: "Tempat keluarnya sisa pencernaan." },
      { word: "KARBOHIDRAT", clue: "Sumber energi utama bagi tubuh." },
      { word: "PROTEIN", clue: "Zat gizi untuk pertumbuhan dan perbaikan jaringan." },
      { word: "LEMAK", clue: "Zat gizi yang menyimpan energi." },
      { word: "GLUKOSA", clue: "Gula sederhana yang digunakan sebagai sumber energi." },
      { word: "NUTRISI", clue: "Zat gizi yang dibutuhkan tubuh." },
      { word: "ABSORPSI", clue: "Proses penyerapan zat makanan." },
      { word: "DEFekasi", clue: "Proses pengeluaran sisa pencernaan dari tubuh." },
    ],
  },
  {
    id: "hewan",
    title: "Hewan",
    description: "Pelajari ciri dan klasifikasi hewan.",
    icon: "🦋",
    questions: [
      { word: "MAMALIA", clue: "Kelompok hewan yang menyusui anaknya." },
      { word: "REPTIL", clue: "Kelompok hewan melata yang umumnya bersisik." },
      { word: "AMPHIBI", clue: "Hewan yang dapat hidup di air dan darat." },
      { word: "VERTEBRATA", clue: "Kelompok hewan yang memiliki tulang belakang." },
      { word: "INVERTEBRATA", clue: "Kelompok hewan tanpa tulang belakang." },
      { word: "HERBIVORA", clue: "Hewan pemakan tumbuhan." },
      { word: "KARNIVORA", clue: "Hewan pemakan daging." },
      { word: "OMNIVORA", clue: "Hewan pemakan tumbuhan dan hewan." },
      { word: "OVIPAR", clue: "Hewan yang berkembang biak dengan bertelur." },
      { word: "VIVIPAR", clue: "Hewan yang berkembang biak dengan melahirkan." },
      { word: "OVOVIVIPAR", clue: "Hewan yang telurnya berkembang di dalam tubuh induk." },
      { word: "METAMORFOSIS", clue: "Perubahan bentuk tubuh selama pertumbuhan." },
      { word: "KAMUFLASE", clue: "Kemampuan menyamarkan diri dengan lingkungan." },
      { word: "HIBERNASI", clue: "Keadaan istirahat panjang pada musim tertentu." },
      { word: "MIGRASI", clue: "Perpindahan hewan dari satu tempat ke tempat lain." },
      { word: "EKOLokasi", clue: "Kemampuan menentukan posisi dengan pantulan suara." },
      { word: "INSANG", clue: "Alat pernapasan pada ikan." },
      { word: "SIRIP", clue: "Alat gerak dan keseimbangan ikan." },
      { word: "ANTENA", clue: "Alat peraba pada banyak jenis serangga." },
      { word: "EKOSISTEM", clue: "Hubungan makhluk hidup dengan lingkungannya." },
    ],
  },
  {
    id: "tumbuhan",
    title: "Tumbuhan",
    description: "Kenali struktur dan kehidupan tumbuhan.",
    icon: "🌱",
    questions: [
      { word: "FOTOSINTESIS", clue: "Proses tumbuhan membuat makanan dengan bantuan cahaya." },
      { word: "KLOROFIL", clue: "Pigmen hijau yang menangkap energi cahaya." },
      { word: "STOMATA", clue: "Celah daun tempat pertukaran gas." },
      { word: "AKAR", clue: "Bagian tumbuhan yang menyerap air dan mineral." },
      { word: "BATANG", clue: "Bagian tumbuhan yang menopang daun dan bunga." },
      { word: "DAUN", clue: "Organ utama tempat fotosintesis." },
      { word: "BUNGA", clue: "Organ reproduksi pada tumbuhan berbunga." },
      { word: "BIJI", clue: "Bagian tumbuhan yang dapat tumbuh menjadi individu baru." },
      { word: "KECAMBAH", clue: "Tumbuhan muda yang baru tumbuh dari biji." },
      { word: "PENYERBUKAN", clue: "Perpindahan serbuk sari ke kepala putik." },
      { word: "PEMBUAHAN", clue: "Peleburan sel kelamin jantan dan betina." },
      { word: "XILEM", clue: "Jaringan pengangkut air dari akar." },
      { word: "FLOEM", clue: "Jaringan pengangkut hasil fotosintesis." },
      { word: "TRANSPIRASI", clue: "Penguapan air melalui bagian tumbuhan." },
      { word: "RHIZOMA", clue: "Batang yang tumbuh mendatar di dalam tanah." },
      { word: "GERMINASI", clue: "Proses perkecambahan biji." },
      { word: "KAMBIUM", clue: "Jaringan yang membantu pertumbuhan diameter batang." },
      { word: "KUTIKULA", clue: "Lapisan pelindung pada permukaan daun." },
      { word: "SERBUK SARI", clue: "Bagian bunga yang membawa sel kelamin jantan." },
      { word: "PUTIK", clue: "Bagian bunga yang menjadi tempat melekatnya serbuk sari." },
    ],
  },
  {
    id: "energi",
    title: "Energi",
    description: "Pahami berbagai bentuk dan perubahan energi.",
    icon: "⚡",
    questions: [
      { word: "KINETIK", clue: "Energi yang dimiliki benda karena bergerak." },
      { word: "POTENSIAL", clue: "Energi yang tersimpan karena posisi atau keadaan." },
      { word: "KIMIA", clue: "Energi yang tersimpan dalam ikatan zat." },
      { word: "LISTRIK", clue: "Energi yang berkaitan dengan muatan listrik." },
      { word: "PANAS", clue: "Energi yang berpindah karena perbedaan suhu." },
      { word: "CAHAYA", clue: "Energi yang dapat diterima oleh mata." },
      { word: "BUNYI", clue: "Energi yang dihasilkan oleh getaran." },
      { word: "MEKANIK", clue: "Gabungan energi kinetik dan potensial." },
      { word: "MATAHARI", clue: "Sumber energi utama bagi Bumi." },
      { word: "GEOTERMAL", clue: "Energi panas yang berasal dari dalam Bumi." },
      { word: "BIOMASSA", clue: "Bahan organik yang dapat dimanfaatkan sebagai energi." },
      { word: "ANGIN", clue: "Gerakan udara yang dapat menghasilkan energi." },
      { word: "HIDRO", clue: "Energi yang memanfaatkan aliran air." },
      { word: "NUKLIR", clue: "Energi yang berasal dari inti atom." },
      { word: "KONDUKSI", clue: "Perpindahan panas melalui zat tanpa perpindahan partikel." },
      { word: "KONVEKSI", clue: "Perpindahan panas yang disertai aliran zat." },
      { word: "RADIASI", clue: "Perpindahan panas tanpa memerlukan medium." },
      { word: "EFISIENSI", clue: "Perbandingan energi berguna dengan energi masuk." },
      { word: "TRANSFORMASI", clue: "Perubahan energi dari satu bentuk ke bentuk lain." },
      { word: "TERBARUKAN", clue: "Sumber energi yang dapat pulih secara alami." },
    ],
  },
  {
    id: "gaya",
    title: "Gaya dan Gerak",
    description: "Temukan konsep dasar mekanika.",
    icon: "🚀",
    questions: [
      { word: "GRAVITASI", clue: "Gaya tarik antara benda yang memiliki massa." },
      { word: "GESEKAN", clue: "Gaya yang menghambat gerak dua permukaan." },
      { word: "INERSIA", clue: "Kecenderungan benda mempertahankan keadaan geraknya." },
      { word: "PERCEPATAN", clue: "Perubahan kecepatan tiap satuan waktu." },
      { word: "KECEPATAN", clue: "Perpindahan tiap satuan waktu." },
      { word: "KELAJUAN", clue: "Jarak yang ditempuh tiap satuan waktu." },
      { word: "MOMENTUM", clue: "Besaran yang bergantung pada massa dan kecepatan." },
      { word: "NEWTON", clue: "Satuan gaya dalam sistem internasional." },
      { word: "MASSA", clue: "Ukuran banyaknya materi dalam benda." },
      { word: "BERAT", clue: "Gaya gravitasi yang bekerja pada benda." },
      { word: "RESULTAN", clue: "Gaya pengganti dari beberapa gaya." },
      { word: "ELASTISITAS", clue: "Kemampuan benda kembali ke bentuk semula." },
      { word: "TEKANAN", clue: "Gaya yang bekerja pada setiap satuan luas." },
      { word: "APUNG", clue: "Gaya ke atas yang dialami benda dalam fluida." },
      { word: "KESETIMBANGAN", clue: "Keadaan ketika resultan gaya bernilai nol." },
      { word: "JARAK", clue: "Panjang seluruh lintasan yang ditempuh." },
      { word: "PERPINDAHAN", clue: "Perubahan posisi dari titik awal ke titik akhir." },
      { word: "USAHA", clue: "Energi yang dipindahkan oleh gaya melalui perpindahan." },
      { word: "DAYA", clue: "Laju melakukan usaha atau memindahkan energi." },
      { word: "TRAJEKTORI", clue: "Lintasan yang dilalui benda saat bergerak." },
    ],
  },
  {
    id: "benda",
    title: "Benda dan Sifatnya",
    description: "Pelajari materi dan perubahan wujud.",
    icon: "🧊",
    questions: [
      { word: "PADAT", clue: "Wujud benda dengan bentuk dan volume tetap." },
      { word: "CAIR", clue: "Wujud benda yang mengikuti bentuk wadahnya." },
      { word: "GAS", clue: "Wujud benda yang mengisi seluruh ruang wadah." },
      { word: "MENCair", clue: "Perubahan wujud padat menjadi cair." },
      { word: "MEMBEKU", clue: "Perubahan wujud cair menjadi padat." },
      { word: "MENGUAP", clue: "Perubahan wujud cair menjadi gas." },
      { word: "MENGEMBUN", clue: "Perubahan wujud gas menjadi cair." },
      { word: "MENYUBLIM", clue: "Perubahan wujud padat langsung menjadi gas." },
      { word: "DEPOSISI", clue: "Perubahan wujud gas langsung menjadi padat." },
      { word: "DENSITAS", clue: "Massa benda per satuan volume." },
      { word: "VOLUME", clue: "Besarnya ruang yang ditempati benda." },
      { word: "MASSA JENIS", clue: "Istilah lain untuk massa per satuan volume." },
      { word: "KELARUTAN", clue: "Kemampuan zat untuk larut dalam pelarut." },
      { word: "KOROSI", clue: "Kerusakan logam akibat reaksi dengan lingkungan." },
      { word: "KONDUKTOR", clue: "Bahan yang mudah menghantarkan panas atau listrik." },
      { word: "ISOLATOR", clue: "Bahan yang sulit menghantarkan panas atau listrik." },
      { word: "CAMPURAN", clue: "Gabungan dua zat atau lebih tanpa reaksi kimia." },
      { word: "LARUTAN", clue: "Campuran homogen antara zat terlarut dan pelarut." },
      { word: "UNSUR", clue: "Zat murni yang tidak dapat diuraikan secara kimia biasa." },
      { word: "SENYAWA", clue: "Zat yang terbentuk dari dua unsur atau lebih." },
    ],
  },
  {
    id: "tatasurya",
    title: "Tata Surya",
    description: "Jelajahi benda-benda langit.",
    icon: "🌌",
    questions: [
      { word: "MATAHARI", clue: "Bintang pusat tata surya kita." },
      { word: "PLANET", clue: "Benda langit yang mengorbit bintang." },
      { word: "SATELIT", clue: "Benda yang mengorbit planet." },
      { word: "ASTEROID", clue: "Benda kecil berbatu yang mengorbit Matahari." },
      { word: "KOMET", clue: "Benda langit yang dapat memiliki ekor saat mendekati Matahari." },
      { word: "METEOR", clue: "Fenomena cahaya saat meteoroid memasuki atmosfer." },
      { word: "METEORIT", clue: "Sisa meteoroid yang mencapai permukaan Bumi." },
      { word: "ORBIT", clue: "Lintasan benda langit mengelilingi benda lain." },
      { word: "ROTASI", clue: "Gerakan berputar pada poros." },
      { word: "REVOLUSI", clue: "Gerakan mengelilingi benda langit lain." },
      { word: "GALAKSI", clue: "Kumpulan besar bintang dan materi antarbintang." },
      { word: "NEBULA", clue: "Awan gas dan debu di ruang angkasa." },
      { word: "KONSTELASI", clue: "Pola bintang yang tampak membentuk gambar tertentu." },
      { word: "KOMET", clue: "Benda langit yang tersusun dari es, debu, dan batuan." },
      { word: "GERHANA", clue: "Peristiwa tertutupnya cahaya benda langit." },
      { word: "KOMET HALLEY", clue: "Komet terkenal yang terlihat dari Bumi secara berkala." },
      { word: "ASTRONOMI", clue: "Ilmu yang mempelajari benda langit." },
      { word: "KOSMOS", clue: "Keseluruhan alam semesta." },
      { word: "GRAVITASI", clue: "Gaya yang menjaga planet tetap pada orbitnya." },
      { word: "SATURNUS", clue: "Planet yang terkenal dengan sistem cincinnya." },
    ],
  },
  {
    id: "planet",
    title: "Planet",
    description: "Kenali planet-planet di tata surya.",
    icon: "🪐",
    questions: [
      { word: "MERKURIUS", clue: "Planet terdekat dari Matahari." },
      { word: "VENUS", clue: "Planet yang memiliki suhu permukaan sangat tinggi." },
      { word: "BUMI", clue: "Planet tempat manusia hidup." },
      { word: "MARS", clue: "Planet yang dikenal sebagai planet merah." },
      { word: "JUPITER", clue: "Planet terbesar dalam tata surya." },
      { word: "SATURNUS", clue: "Planet dengan cincin yang sangat jelas." },
      { word: "URANUS", clue: "Planet yang berotasi dengan kemiringan ekstrem." },
      { word: "NEPTUNUS", clue: "Planet terjauh dari Matahari." },
      { word: "ATMOSFER", clue: "Lapisan gas yang menyelimuti planet." },
      { word: "KUTUB", clue: "Wilayah ujung utara dan selatan sebuah planet." },
      { word: "KAWAH", clue: "Cekungan yang dapat terbentuk akibat tumbukan." },
      { word: "SATELIT ALAMI", clue: "Benda langit yang mengorbit planet secara alami." },
      { word: "BULAN", clue: "Satelit alami Bumi." },
      { word: "KALA REVOLUSI", clue: "Waktu yang dibutuhkan untuk satu kali mengorbit." },
      { word: "KALA ROTASI", clue: "Waktu yang dibutuhkan untuk satu kali berputar." },
      { word: "KELAYAKHUNIAN", clue: "Kondisi yang mendukung kemungkinan kehidupan." },
      { word: "PLANET KERDIL", clue: "Benda langit yang mengorbit Matahari tetapi belum memenuhi semua kriteria planet." },
      { word: "EKSOPLANET", clue: "Planet yang mengorbit bintang selain Matahari." },
      { word: "ATMOSFER BUMI", clue: "Lapisan udara yang melindungi kehidupan di Bumi." },
      { word: "ZONA HABITASI", clue: "Wilayah sekitar bintang yang berpotensi memiliki air cair." },
    ],
  },
  {
    id: "cuaca",
    title: "Cuaca dan Iklim",
    description: "Pahami fenomena atmosfer.",
    icon: "🌦️",
    questions: [
      { word: "ATMOSFER", clue: "Lapisan gas yang menyelimuti Bumi." },
      { word: "TROPOSFER", clue: "Lapisan atmosfer tempat sebagian besar cuaca terjadi." },
      { word: "STRATOSFER", clue: "Lapisan atmosfer tempat terdapat lapisan ozon." },
      { word: "HIGROMETER", clue: "Alat untuk mengukur kelembapan udara." },
      { word: "BAROMETER", clue: "Alat untuk mengukur tekanan udara." },
      { word: "TERMOMETER", clue: "Alat untuk mengukur suhu." },
      { word: "ANEMOMETER", clue: "Alat untuk mengukur kecepatan angin." },
      { word: "PLUVIOMETER", clue: "Alat untuk mengukur curah hujan." },
      { word: "KELEMBAPAN", clue: "Kandungan uap air di udara." },
      { word: "PRESIPITASI", clue: "Jatuhnya air dari atmosfer ke permukaan Bumi." },
      { word: "EVAPORASI", clue: "Penguapan air dari permukaan." },
      { word: "KONDENSASI", clue: "Perubahan uap air menjadi titik-titik air." },
      { word: "KONVEKSI", clue: "Perpindahan panas melalui gerakan fluida." },
      { word: "SIKLON", clue: "Sistem angin yang berputar mengelilingi pusat tekanan rendah." },
      { word: "ANTISIKLON", clue: "Sistem angin yang berputar mengelilingi pusat tekanan tinggi." },
      { word: "MONSUN", clue: "Angin musiman yang berubah arah secara berkala." },
      { word: "EL NINO", clue: "Fenomena pemanasan suhu permukaan laut di Pasifik tengah dan timur." },
      { word: "LA NINA", clue: "Fenomena pendinginan suhu permukaan laut di Pasifik tengah dan timur." },
      { word: "ISOBAR", clue: "Garis pada peta yang menghubungkan tekanan udara sama." },
      { word: "ISOTERM", clue: "Garis pada peta yang menghubungkan suhu sama." },
    ],
  },
  {
    id: "air",
    title: "Air dan Siklus Air",
    description: "Pelajari perjalanan air di Bumi.",
    icon: "💧",
    questions: [
      { word: "HIDROLOGI", clue: "Ilmu yang mempelajari air di Bumi." },
      { word: "EVAPORASI", clue: "Penguapan air karena panas." },
      { word: "TRANSPIRASI", clue: "Penguapan air dari tumbuhan." },
      { word: "KONDENSASI", clue: "Perubahan uap air menjadi titik air." },
      { word: "PRESIPITASI", clue: "Jatuhnya air dari awan ke Bumi." },
      { word: "INFILTRASI", clue: "Masuknya air ke dalam tanah." },
      { word: "RUNOFF", clue: "Aliran air di atas permukaan tanah." },
      { word: "AQUIFER", clue: "Lapisan batuan yang menyimpan dan mengalirkan air tanah." },
      { word: "MATA AIR", clue: "Tempat keluarnya air tanah secara alami." },
      { word: "DAERAH ALIRAN SUNGAI", clue: "Wilayah yang mengalirkan air menuju satu sungai utama." },
      { word: "DAS", clue: "Singkatan dari daerah aliran sungai." },
      { word: "SALINITAS", clue: "Kadar garam yang terlarut dalam air." },
      { word: "KAPILARITAS", clue: "Kemampuan air bergerak melalui celah kecil." },
      { word: "DIFUSI", clue: "Perpindahan partikel dari konsentrasi tinggi ke rendah." },
      { word: "OSMOSIS", clue: "Perpindahan air melalui membran semipermeabel." },
      { word: "DESALINASI", clue: "Proses mengurangi kadar garam pada air laut." },
      { word: "SEDIMENTASI", clue: "Pengendapan material yang terbawa air." },
      { word: "EROSI", clue: "Pengikisan tanah atau batuan oleh air." },
      { word: "KUALITAS AIR", clue: "Ukuran kondisi air berdasarkan sifat fisik, kimia, dan biologis." },
      { word: "DAUR AIR", clue: "Perputaran air dari Bumi ke atmosfer dan kembali lagi." },
    ],
  },
  {
    id: "lingkungan",
    title: "Lingkungan Hidup",
    description: "Jaga keseimbangan alam dan lingkungan.",
    icon: "🌳",
    questions: [
      { word: "KONSERVASI", clue: "Upaya melindungi dan melestarikan alam." },
      { word: "REBOISASI", clue: "Penanaman kembali hutan yang gundul." },
      { word: "DEFORESTASI", clue: "Penghilangan tutupan hutan." },
      { word: "POLUSI", clue: "Masuknya zat atau energi yang merusak lingkungan." },
      { word: "RECYCLE", clue: "Mengolah kembali barang bekas menjadi produk baru." },
      { word: "REUSE", clue: "Menggunakan kembali barang yang masih layak." },
      { word: "REDUCE", clue: "Mengurangi penggunaan sumber daya dan sampah." },
      { word: "BIODEGRADASI", clue: "Penguraian bahan oleh organisme." },
      { word: "KOMPOS", clue: "Pupuk yang berasal dari penguraian bahan organik." },
      { word: "SANITASI", clue: "Upaya menjaga kebersihan dan kesehatan lingkungan." },
      { word: "EMISI", clue: "Pelepasan gas atau zat ke atmosfer." },
      { word: "KARBON", clue: "Unsur utama dalam senyawa organik." },
      { word: "JEJAK KARBON", clue: "Jumlah emisi gas rumah kaca dari suatu aktivitas." },
      { word: "PEMANASAN GLOBAL", clue: "Kenaikan suhu rata-rata Bumi dalam jangka panjang." },
      { word: "EFEK RUMAH KACA", clue: "Proses terperangkapnya panas oleh gas di atmosfer." },
      { word: "KEBERLANJUTAN", clue: "Pemanfaatan sumber daya tanpa merusak kebutuhan masa depan." },
      { word: "HABITAT", clue: "Tempat alami suatu organisme hidup." },
      { word: "BIODIVERSITAS", clue: "Keanekaragaman makhluk hidup." },
      { word: "PENCEMARAN", clue: "Masuknya bahan berbahaya ke lingkungan." },
      { word: "EKOREGION", clue: "Wilayah dengan karakter ekologi yang relatif serupa." },
    ],
  },
  {
    id: "ekosistem",
    title: "Ekosistem",
    description: "Pahami hubungan antarorganisme.",
    icon: "🌿",
    questions: [
      { word: "EKOSISTEM", clue: "Kesatuan antara makhluk hidup dan lingkungannya." },
      { word: "BIOTIK", clue: "Komponen ekosistem yang berupa makhluk hidup." },
      { word: "ABIOTIK", clue: "Komponen ekosistem yang tidak hidup." },
      { word: "POPULASI", clue: "Kumpulan individu sejenis di suatu tempat." },
      { word: "KOMUNITAS", clue: "Kumpulan berbagai populasi yang hidup bersama." },
      { word: "BIOSFER", clue: "Seluruh wilayah Bumi yang mendukung kehidupan." },
      { word: "PRODUSEN", clue: "Organisme yang membuat makanan sendiri." },
      { word: "KONSUMEN", clue: "Organisme yang memperoleh energi dengan memakan organisme lain." },
      { word: "DEKOMPOSER", clue: "Organisme yang menguraikan sisa makhluk hidup." },
      { word: "DETRITIVOR", clue: "Organisme yang memakan sisa bahan organik." },
      { word: "SIMBIOSIS", clue: "Hubungan erat antara dua organisme berbeda." },
      { word: "MUTUALISME", clue: "Hubungan yang menguntungkan kedua organisme." },
      { word: "KOMENSALISME", clue: "Hubungan yang menguntungkan satu pihak tanpa merugikan pihak lain." },
      { word: "PARASITISME", clue: "Hubungan ketika satu organisme diuntungkan dan inang dirugikan." },
      { word: "PREDASI", clue: "Interaksi ketika satu organisme memangsa organisme lain." },
      { word: "KOMPETISI", clue: "Persaingan organisme memperoleh sumber daya." },
      { word: "NICHE", clue: "Peran suatu organisme dalam ekosistem." },
      { word: "SUKSESI", clue: "Perubahan komunitas ekosistem secara bertahap." },
      { word: "DAYA DUKUNG", clue: "Kemampuan lingkungan menopang populasi." },
      { word: "KESEIMBANGAN", clue: "Kondisi hubungan komponen ekosistem yang relatif stabil." },
    ],
  },
  {
    id: "rantai",
    title: "Rantai Makanan",
    description: "Telusuri aliran energi dalam ekosistem.",
    icon: "🐛",
    questions: [
      { word: "RANTAI MAKANAN", clue: "Urutan makan dan dimakan antarorganisme." },
      { word: "JARING MAKANAN", clue: "Gabungan beberapa rantai makanan." },
      { word: "TROFIK", clue: "Tingkatan organisme dalam aliran energi." },
      { word: "PRODUSEN", clue: "Organisme pada dasar rantai makanan." },
      { word: "KONSUMEN PRIMER", clue: "Organisme yang memakan produsen." },
      { word: "KONSUMEN SEKUNDER", clue: "Organisme yang memakan konsumen primer." },
      { word: "KONSUMEN TERSIER", clue: "Organisme yang memakan konsumen sekunder." },
      { word: "PREDATOR", clue: "Hewan yang memburu organisme lain." },
      { word: "MANGSA", clue: "Organisme yang diburu oleh predator." },
      { word: "PENGURAI", clue: "Organisme yang memecah sisa makhluk hidup." },
      { word: "FITOPLANKTON", clue: "Organisme mikroskopis yang berfotosintesis di perairan." },
      { word: "ZOOPLANKTON", clue: "Organisme kecil di perairan yang memakan plankton lain." },
      { word: "BIOMASSA", clue: "Jumlah massa organisme pada suatu tingkat trofik." },
      { word: "PIRAMIDA ENERGI", clue: "Diagram yang menggambarkan energi pada setiap tingkat trofik." },
      { word: "ALIRAN ENERGI", clue: "Perpindahan energi melalui organisme dalam ekosistem." },
      { word: "DETRITUS", clue: "Sisa organisme mati dan bahan organik." },
      { word: "NEKTON", clue: "Organisme perairan yang mampu berenang aktif." },
      { word: "BENTOS", clue: "Organisme yang hidup di dasar perairan." },
      { word: "OMNIVORA", clue: "Konsumen yang memakan tumbuhan dan hewan." },
      { word: "HERBIVORA", clue: "Konsumen yang memakan tumbuhan." },
    ],
  },
  {
    id: "indera",
    title: "Alat Indera",
    description: "Kenali cara tubuh menerima rangsangan.",
    icon: "👁️",
    questions: [
      { word: "RETINA", clue: "Lapisan mata yang menangkap cahaya." },
      { word: "KORNEA", clue: "Lapisan bening di bagian depan mata." },
      { word: "PUPIL", clue: "Lubang tempat masuknya cahaya ke mata." },
      { word: "IRIS", clue: "Bagian mata yang mengatur ukuran pupil." },
      { word: "LENSA", clue: "Bagian mata yang membantu memfokuskan cahaya." },
      { word: "KOKLEA", clue: "Bagian telinga dalam yang berperan dalam pendengaran." },
      { word: "GENDANG TELINGA", clue: "Selaput yang bergetar saat menerima gelombang suara." },
      { word: "SALURAN SEMISIRKULAR", clue: "Bagian telinga dalam yang membantu keseimbangan." },
      { word: "KEMORESEPTOR", clue: "Reseptor yang mendeteksi zat kimia." },
      { word: "FOTORESEPTOR", clue: "Reseptor yang peka terhadap cahaya." },
      { word: "MEKANORESEPTOR", clue: "Reseptor yang merespons tekanan atau getaran." },
      { word: "TERMOReseptor", clue: "Reseptor yang mendeteksi perubahan suhu." },
      { word: "NOSISEPTOR", clue: "Reseptor yang mendeteksi rangsangan berbahaya." },
      { word: "PAPILA", clue: "Tonjolan kecil pada permukaan lidah." },
      { word: "SARAF OPTIK", clue: "Saraf yang membawa informasi visual ke otak." },
      { word: "SARAF AUDITORI", clue: "Saraf yang membawa informasi pendengaran ke otak." },
      { word: "EPIDERMIS", clue: "Lapisan terluar kulit." },
      { word: "RESEPTOR", clue: "Struktur yang menerima rangsangan." },
      { word: "IMPULS", clue: "Sinyal listrik yang merambat pada saraf." },
      { word: "SENSORI", clue: "Berkaitan dengan penerimaan rangsangan." },
    ],
  },
  {
    id: "listrik",
    title: "Listrik",
    description: "Pelajari konsep kelistrikan sederhana.",
    icon: "🔌",
    questions: [
      { word: "ARUS", clue: "Aliran muatan listrik." },
      { word: "TEGANGAN", clue: "Beda potensial listrik antara dua titik." },
      { word: "HAMBATAN", clue: "Ukuran kesulitan aliran arus listrik." },
      { word: "KONDUKTOR", clue: "Bahan yang mudah menghantarkan listrik." },
      { word: "ISOLATOR", clue: "Bahan yang sulit menghantarkan listrik." },
      { word: "RESISTOR", clue: "Komponen untuk menghambat arus listrik." },
      { word: "BATERAI", clue: "Sumber energi listrik dari reaksi kimia." },
      { word: "GENERATOR", clue: "Alat yang mengubah energi mekanik menjadi listrik." },
      { word: "DINAMO", clue: "Alat pembangkit listrik melalui gerakan." },
      { word: "SEKRING", clue: "Pengaman yang memutus arus berlebih." },
      { word: "SAKLAR", clue: "Alat untuk menyambung dan memutus rangkaian." },
      { word: "SIRKUIT", clue: "Jalur tertutup tempat arus listrik mengalir." },
      { word: "PARALEL", clue: "Susunan rangkaian dengan beberapa cabang." },
      { word: "SERI", clue: "Susunan komponen dalam satu jalur." },
      { word: "WATT", clue: "Satuan daya listrik." },
      { word: "AMPERE", clue: "Satuan kuat arus listrik." },
      { word: "VOLT", clue: "Satuan tegangan listrik." },
      { word: "OHM", clue: "Satuan hambatan listrik." },
      { word: "ELEKTRON", clue: "Partikel bermuatan negatif." },
      { word: "STATIS", clue: "Keadaan muatan listrik yang terkumpul pada permukaan benda." },
    ],
  },
  {
    id: "magnet",
    title: "Magnet",
    description: "Jelajahi gaya dan sifat kemagnetan.",
    icon: "🧲",
    questions: [
      { word: "MAGNET", clue: "Benda yang dapat menarik bahan tertentu seperti besi." },
      { word: "KUTUB UTARA", clue: "Salah satu ujung magnet yang menunjuk ke utara." },
      { word: "KUTUB SELATAN", clue: "Salah satu ujung magnet yang menunjuk ke selatan." },
      { word: "FEROMAGNETIK", clue: "Bahan yang ditarik kuat oleh magnet." },
      { word: "PARAMAGNETIK", clue: "Bahan yang ditarik lemah oleh magnet." },
      { word: "DIAMAGNETIK", clue: "Bahan yang ditolak lemah oleh medan magnet." },
      { word: "INDUKSI", clue: "Proses membuat benda memiliki sifat magnet akibat pengaruh magnet." },
      { word: "ELEKTROMAGNET", clue: "Magnet yang dihasilkan oleh arus listrik." },
      { word: "MEDAN MAGNET", clue: "Daerah di sekitar magnet yang masih dipengaruhi gaya magnet." },
      { word: "KOMPAS", clue: "Alat penunjuk arah yang menggunakan magnet." },
      { word: "SOLENOIDA", clue: "Kumparan kawat berbentuk silinder." },
      { word: "ELEKTROMAGNETISME", clue: "Hubungan antara gejala listrik dan magnet." },
      { word: "FLUKS", clue: "Ukuran jumlah medan magnet yang menembus suatu bidang." },
      { word: "GAUSS", clue: "Satuan lama untuk kerapatan fluks magnet." },
      { word: "TESLA", clue: "Satuan SI untuk medan magnet." },
      { word: "KUTUB MAGNET", clue: "Daerah ujung magnet dengan gaya paling kuat." },
      { word: "ATRAKSI", clue: "Gaya tarik antara dua kutub magnet berbeda." },
      { word: "REPULSI", clue: "Gaya tolak antara dua kutub magnet sejenis." },
      { word: "INDUKSI ELEKTROMAGNETIK", clue: "Timbulnya tegangan akibat perubahan medan magnet." },
      { word: "DOMAIN", clue: "Kelompok kecil daerah magnetik dalam bahan." },
    ],
  },
  {
    id: "cahaya",
    title: "Cahaya",
    description: "Pahami sifat dan perambatan cahaya.",
    icon: "💡",
    questions: [
      { word: "REFLEKSI", clue: "Peristiwa pemantulan cahaya." },
      { word: "REFRAKSI", clue: "Peristiwa pembiasan cahaya." },
      { word: "DISPERSI", clue: "Penguraian cahaya menjadi berbagai warna." },
      { word: "DIFRAKSI", clue: "Pelenturan gelombang saat melewati celah." },
      { word: "INTERFERENSI", clue: "Perpaduan dua gelombang atau lebih." },
      { word: "POLARISASI", clue: "Peristiwa pembatasan arah getar gelombang cahaya." },
      { word: "FOTON", clue: "Partikel pembawa energi cahaya." },
      { word: "SPEKTRUM", clue: "Rentang panjang gelombang cahaya." },
      { word: "LENSA", clue: "Benda bening yang membiaskan cahaya." },
      { word: "CERMIN", clue: "Permukaan yang memantulkan cahaya." },
      { word: "KONVERGEN", clue: "Sifat lensa yang mengumpulkan sinar." },
      { word: "DIVERGEN", clue: "Sifat lensa yang menyebarkan sinar." },
      { word: "FOKUS", clue: "Titik tempat sinar berkumpul atau seolah berasal." },
      { word: "OPTIK", clue: "Cabang ilmu fisika yang mempelajari cahaya." },
      { word: "TRANSPARAN", clue: "Bahan yang meneruskan cahaya dengan jelas." },
      { word: "TRANSLUSEN", clue: "Bahan yang meneruskan cahaya tetapi tidak jelas." },
      { word: "OPAK", clue: "Bahan yang tidak dapat ditembus cahaya." },
      { word: "LASER", clue: "Cahaya yang terarah dan memiliki sifat koheren." },
      { word: "ULTRAVIOLET", clue: "Radiasi elektromagnetik dengan panjang gelombang lebih pendek dari cahaya ungu." },
      { word: "INFRAMERAH", clue: "Radiasi elektromagnetik yang berada di bawah warna merah." },
    ],
  },
  {
    id: "bunyi",
    title: "Bunyi",
    description: "Kenali gelombang suara dan sifatnya.",
    icon: "🔊",
    questions: [
      { word: "FREKUENSI", clue: "Jumlah getaran dalam satu detik." },
      { word: "AMPLITUDO", clue: "Simpangan maksimum suatu getaran." },
      { word: "RESONANSI", clue: "Peristiwa ikut bergetarnya benda akibat frekuensi yang sesuai." },
      { word: "GEMA", clue: "Bunyi pantul yang terdengar setelah bunyi asli." },
      { word: "GAUNG", clue: "Bunyi pantul yang bercampur dengan bunyi asli." },
      { word: "ULTRASONIK", clue: "Bunyi dengan frekuensi di atas 20.000 Hz." },
      { word: "INFRASONIK", clue: "Bunyi dengan frekuensi di bawah 20 Hz." },
      { word: "AUDIOSONIK", clue: "Bunyi yang dapat didengar manusia." },
      { word: "GETARAN", clue: "Gerak bolak-balik melalui titik keseimbangan." },
      { word: "GELOMBANG", clue: "Getaran yang merambat membawa energi." },
      { word: "MEDIUM", clue: "Zat perantara rambat gelombang bunyi." },
      { word: "DESIBEL", clue: "Satuan tingkat intensitas bunyi." },
      { word: "PITCH", clue: "Kesan tinggi atau rendahnya bunyi." },
      { word: "TIMBRE", clue: "Warna bunyi yang membedakan sumber suara." },
      { word: "AKUSTIK", clue: "Ilmu yang mempelajari bunyi." },
      { word: "SONAR", clue: "Teknologi untuk mendeteksi objek menggunakan gelombang suara." },
      { word: "DOPPLER", clue: "Perubahan frekuensi akibat gerak relatif sumber dan pengamat." },
      { word: "LONGITUDINAL", clue: "Gelombang dengan arah getar sejajar arah rambat." },
      { word: "INTENSITAS", clue: "Energi gelombang yang melewati satuan luas tiap detik." },
      { word: "PERIODE", clue: "Waktu yang diperlukan untuk satu getaran." },
    ],
  },
];

const normalize = (value: string) =>
  value
    .toLocaleUpperCase("id-ID")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

export default function DetektifSainsGame() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [finished, setFinished] = useState(false);
  const [answered, setAnswered] = useState(false);

  const currentQuestion = questions[questionIndex];

  const totalWords = useMemo(
    () => categories.reduce((total, category) => total + category.questions.length, 0),
    []
  );

  const completedCount = questionIndex + (answered ? 1 : 0);

  const startGame = (category: Category) => {
    setSelectedCategory(category);
    setQuestions(shuffle(category.questions));
    setQuestionIndex(0);
    setAnswer("");
    setScore(0);
    setCorrectCount(0);
    setShowHint(false);
    setFeedback(null);
    setFinished(false);
    setAnswered(false);
  };

  const checkAnswer = () => {
    if (!currentQuestion || answered || !answer.trim()) return;

    if (normalize(answer) === normalize(currentQuestion.word)) {
      setFeedback("correct");
      setScore((previous) => previous + (showHint ? 5 : 10));
      setCorrectCount((previous) => previous + 1);
    } else {
      setFeedback("wrong");
    }

    setAnswered(true);
  };

  const nextQuestion = () => {
    if (questionIndex + 1 >= questions.length) {
      setFinished(true);
      return;
    }

    setQuestionIndex((previous) => previous + 1);
    setAnswer("");
    setShowHint(false);
    setFeedback(null);
    setAnswered(false);
  };

  const backToMenu = () => {
    setSelectedCategory(null);
    setQuestions([]);
    setQuestionIndex(0);
    setAnswer("");
    setScore(0);
    setCorrectCount(0);
    setShowHint(false);
    setFeedback(null);
    setFinished(false);
    setAnswered(false);
  };

  const playAgain = () => {
    if (selectedCategory) startGame(selectedCategory);
  };

  const progress = questions.length
    ? ((questionIndex + (answered ? 1 : 0)) / questions.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      {!selectedCategory ? (
        <>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-lg md:p-8">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-white/10" />

            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                  <Sparkles size={15} />
                  GradeUp Games
                </div>

                <h2 className="text-3xl font-extrabold md:text-4xl">
                  Detektif Sains IPA
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-emerald-50 md:text-base">
                  Jadilah detektif sains! Pecahkan petunjuk, tebak istilah
                  ilmiah, dan kuasai kosakata IPA melalui permainan seru.
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-white/15 px-3 py-1.5">
                    📚 {totalWords} Kosakata
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1.5">
                    🧪 {categories.length} Modul
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1.5">
                    🎁 Gratis
                  </span>
                </div>
              </div>

              <div className="hidden h-32 w-32 shrink-0 items-center justify-center rounded-3xl bg-white/15 md:flex">
                <Microscope size={76} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Pilih Modul Pembelajaran
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pilih kategori dan mulai tantangan kosakata IPA.
              </p>
            </div>
            <span className="text-sm font-semibold text-emerald-600">
              {categories.length} Modul tersedia
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => startGame(category)}
                className="group rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl dark:bg-emerald-950/50">
                    {category.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    MODUL {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h4 className="mt-4 font-bold text-gray-900 dark:text-white">
                  {category.title}
                </h4>
                <p className="mt-1 min-h-10 text-sm text-gray-500 dark:text-gray-400">
                  {category.description}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500">
                    {category.questions.length} kosakata
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 transition group-hover:gap-2">
                    Mulai <ArrowRight size={16} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : finished ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-7 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-950/40">
            <Trophy size={42} />
          </div>

          <h2 className="mt-5 text-2xl font-extrabold text-gray-900 dark:text-white">
            Modul Selesai!
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Kamu telah menyelesaikan modul {selectedCategory.title}.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
              <p className="text-3xl font-extrabold text-emerald-600">{score}</p>
              <p className="mt-1 text-xs text-gray-500">Total skor</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30">
              <p className="text-3xl font-extrabold text-blue-600">
                {correctCount}/{questions.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">Jawaban benar</p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={playAgain}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              <RotateCcw size={17} /> Main Lagi
            </button>
            <button
              onClick={backToMenu}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <ArrowLeft size={17} /> Pilih Modul
            </button>
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={backToMenu}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-emerald-600"
            >
              <ArrowLeft size={17} /> Kembali ke modul
            </button>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {selectedCategory.icon} {selectedCategory.title}
            </span>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Tantangan kosakata
                </p>
                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  Pertanyaan {questionIndex + 1}
                  <span className="font-normal text-gray-400">
                    {" "}/ {questions.length}
                  </span>
                </h2>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-600 dark:bg-amber-950/30">
                ⭐ {score} poin
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-6 text-center dark:from-emerald-950/30 dark:to-cyan-950/20 md:p-8">
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                🔍 TEMUKAN ISTILAH ILMIAH
              </div>

              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-gray-700 dark:text-gray-200">
                {currentQuestion.clue}
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-1.5">
                {currentQuestion.word.split("").map((letter, index) => (
                  <span
                    key={`${index}-${letter}`}
                    className={`flex h-9 min-w-8 items-center justify-center rounded-lg border px-1 text-sm font-extrabold sm:h-11 sm:min-w-9 sm:text-base ${
                      letter === " "
                        ? "border-transparent bg-transparent"
                        : "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-400"
                    }`}
                  >
                    {letter === " "
                      ? ""
                      : answered
                        ? letter
                        : index === 0 || index === currentQuestion.word.length - 1
                          ? letter
                          : "_"}
                  </span>
                ))}
              </div>

              <p className="mt-3 text-xs text-gray-500">
                {currentQuestion.word.replace(/ /g, "").length} huruf
              </p>
            </div>

            {showHint && !answered && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                <Lightbulb size={19} className="mt-0.5 shrink-0" />
                <p>
                  Petunjuk tambahan: kata ini termasuk dalam kategori{" "}
                  <strong>{selectedCategory.title}</strong>. Jawaban dengan
                  bantuan petunjuk bernilai 5 poin.
                </p>
              </div>
            )}

            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Masukkan jawabanmu
              </label>
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (answered) nextQuestion();
                    else checkAnswer();
                  }
                }}
                disabled={answered}
                placeholder="Ketik istilah ilmiah di sini..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
              />
            </div>

            {feedback && (
              <div
                className={`mt-4 flex items-start gap-3 rounded-xl p-4 text-sm ${
                  feedback === "correct"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                }`}
              >
                {feedback === "correct" ? (
                  <CheckCircle2 size={20} className="shrink-0" />
                ) : (
                  <XCircle size={20} className="shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {feedback === "correct" ? "Jawaban benar!" : "Belum tepat!"}
                  </p>
                  <p className="mt-1">
                    {feedback === "correct"
                      ? `Kamu memperoleh ${showHint ? 5 : 10} poin. Bagus!`
                      : `Jawaban yang benar adalah: ${currentQuestion.word}`}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {!answered ? (
                <>
                  <button
                    onClick={() => setShowHint(true)}
                    disabled={showHint}
                    className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 px-4 py-3 font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900 dark:text-amber-400"
                  >
                    <Lightbulb size={17} /> Gunakan Petunjuk
                  </button>
                  <button
                    onClick={checkAnswer}
                    disabled={!answer.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Periksa Jawaban <CheckCircle2 size={17} />
                  </button>
                </>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                >
                  {questionIndex + 1 >= questions.length
                    ? "Lihat Hasil"
                    : "Pertanyaan Berikutnya"}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
