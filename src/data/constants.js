/**
 * Application Constants
 */

// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';
export const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT) || 10000;

// User Roles
export const USER_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
};

// Appointment Types
export const APPOINTMENT_TYPES = {
  ONLINE: 'online',
  IN_PERSON: 'clinic',  // Backend expects 'clinic' not 'in-person'
  // EMERGENCY: 'emergency',
};

// Appointment Status
// NOTE:
// Consultation consent can be CREATED only when appointment is UPCOMING
// Consultation consent is AUTO-EXPIRED when appointment becomes COMPLETED or CANCELLED
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

// Emergency Urgency Levels
export const URGENCY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// Emergency Status
export const EMERGENCY_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Medical Record Types
export const RECORD_TYPES = {
  PRESCRIPTION: 'prescription',
  LAB_REPORT: 'lab-report',
  X_RAY: 'x-ray',
  OTHER: 'other',
};

// Record Status
export const RECORD_STATUS = {
  VERIFIED: 'verified',
  PENDING: 'pending',
  // TRANSCRIBED: 'transcribed',
  REJECTED: 'rejected',
};

// Medication Status
export const MEDICATION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DISCONTINUED: 'discontinued',
};
// Consent Types
export const CONSENT_TYPES = {
  CONSULTATION: 'consultation',
  EXTENDED: 'extended',
};

// Consent Status
// ACTIVE: patient-approved
// REVOKED: patient manually removed
// EXPIRED: system-enforced (e.g. consultation ended)
export const CONSENT_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
};

// Access Request Status
export const ACCESS_REQUEST_STATUS = {
  PENDING: 'pending',
  DENIED: 'denied',
  CANCELLED: 'cancelled',
};

// Unified Access Resolution Status (Backend driven)
export const ACCESS_STATUS = {
  GRANTED: 'GRANTED',
  PENDING: 'PENDING',
  DENIED: 'DENIED',
  NO_ACCESS: 'NO_ACCESS',
};

// API Error Codes (SSOT)
export const API_ERROR_CODES = {
  CONSENT_ALREADY_EXISTS: 'CONSENT_ALREADY_EXISTS',
  CONSENT_NOT_FOUND: 'CONSENT_NOT_FOUND',
  CONSENT_NOT_ACTIVE: 'CONSENT_NOT_ACTIVE',

  ACCESS_ALREADY_GRANTED: 'ACCESS_ALREADY_GRANTED',
  ACCESS_REQUEST_NOT_FOUND: 'ACCESS_REQUEST_NOT_FOUND',
  ACCESS_REQUEST_NOT_PENDING: 'ACCESS_REQUEST_NOT_PENDING',
  ACCESS_UNAUTHORIZED: 'ACCESS_UNAUTHORIZED',

  APPOINTMENT_REQUIRED: 'APPOINTMENT_REQUIRED',
  APPOINTMENT_NOT_UPCOMING: 'APPOINTMENT_NOT_UPCOMING',
  REQUEST_EXPIRED: 'REQUEST_EXPIRED',
};

// Blood Groups
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Gender Options
export const GENDERS = ['male', 'female', 'other'];

// Medical Specializations
export const SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Orthopedic',
  'Neurologist',
  'ENT',
  'Gynecologist',
  'Psychiatrist',
  'Dentist',
  'Ophthalmologist',
  'Urologist',
  'Gastroenterologist',
  'Endocrinologist',
  'Pulmonologist',
];

// Days of Week
export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Country Codes
export const COUNTRY_CODES = [
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
];

// Video Call Status
export const CALL_STATUS = {
  IDLE: 'idle',
  RINGING: 'ringing',
  IN_PROGRESS: 'in_progress',
  ENDED: 'ended',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  APPOINTMENT: 'appointment',
  EMERGENCY: 'emergency',
  PRESCRIPTION: 'prescription',
  MESSAGE: 'message',
  SYSTEM: 'system',
};

// Analytics Periods
export const ANALYTICS_PERIODS = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  CUSTOM: 'custom',
};

// Search Radius for Emergency (in km)
export const EMERGENCY_SEARCH_RADIUS = 5;
export const EMERGENCY_SEARCH_RADIUS_MAX = 10;

// Slot Duration (in minutes)
export const DEFAULT_SLOT_DURATION = 30;

// Cancellation Cutoff (in hours)
export const CANCELLATION_CUTOFF_HOURS = 24;

// Pagination
export const ITEMS_PER_PAGE = 20;

// Image Upload
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

// Indian States and Union Territories (all 28 states + 8 UTs)
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

// All districts for each state/UT
export const CITIES_BY_STATE = {
  'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  'Andhra Pradesh': [
    'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla',
    'Chittoor', 'East Godavari', 'Eluru', 'Guntur', 'Kakinada',
    'Konaseema', 'Krishna', 'Kurnool', 'Nandyal', 'NTR',
    'Palnadu', 'Parvathipuram Manyam', 'Prakasam', 'Nellore', 'Srikakulam',
    'Sri Potti Sriramulu Nellore', 'Tirupati', 'Visakhapatnam', 'Vizianagaram',
    'West Godavari', 'YSR Kadapa',
  ],
  'Arunachal Pradesh': [
    'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang',
    'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit',
    'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai',
    'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang',
    'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang',
  ],
  'Assam': [
    'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar',
    'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri',
    'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Guwahati',
    'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan',
    'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli',
    'Morigaon', 'Nagaon', 'Nalbari', 'Sichar', 'Silchar',
    'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri',
    'West Karbi Anglong',
  ],
  'Bihar': [
    'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai',
    'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran',
    'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
    'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura',
    'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada',
    'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur',
    'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan',
    'Supaul', 'Vaishali', 'West Champaran',
  ],
  'Chandigarh': ['Chandigarh'],
  'Chhattisgarh': [
    'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara',
    'Bhilai', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari',
    'Durg', 'Gariaband', 'Gaurela Pendra Marwahi', 'Janjgir-Champa', 'Jashpur',
    'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya',
    'Mahasamund', 'Manendragarh', 'Mohla Manpur', 'Mungeli', 'Narayanpur',
    'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh',
    'Sukma', 'Surajpur', 'Surguja',
  ],
  'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  'Delhi': [
    'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
    'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi',
    'West Delhi',
  ],
  'Goa': ['North Goa', 'South Goa', 'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Gujarat': [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha',
    'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod',
    'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh',
    'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi',
    'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar',
    'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi',
    'Vadodara', 'Valsad',
  ],
  'Haryana': [
    'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad',
    'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal',
    'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal',
    'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa',
    'Sonipat', 'Yamunanagar',
  ],
  'Himachal Pradesh': [
    'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur',
    'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur',
    'Solan', 'Una',
  ],
  'Jammu and Kashmir': [
    'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda',
    'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam',
    'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban',
    'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur',
  ],
  'Jharkhand': [
    'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka',
    'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla',
    'Hazaribagh', 'Jamshedpur', 'Jamtara', 'Khunti', 'Koderma',
    'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh',
    'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum',
  ],
  'Karnataka': [
    'Bagalkot', 'Bangalore', 'Bangalore Rural', 'Belgaum', 'Bellary',
    'Bidar', 'Chamarajanagar', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga',
    'Dakshina Kannada', 'Davangere', 'Dharwad', 'Gadag', 'Gulbarga',
    'Hassan', 'Haveri', 'Hubli', 'Kodagu', 'Kolar',
    'Koppal', 'Mandya', 'Mangalore', 'Mysore', 'Raichur',
    'Ramanagara', 'Shimoga', 'Tumkur', 'Udupi', 'Uttara Kannada',
    'Vijayapura', 'Yadgir',
  ],
  'Kerala': [
    'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
    'Kochi', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram',
    'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad',
  ],
  'Ladakh': ['Kargil', 'Leh'],
  'Lakshadweep': ['Lakshadweep'],
  'Madhya Pradesh': [
    'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat',
    'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur',
    'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas',
    'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda',
    'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni',
    'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena',
    'Narsinghpur', 'Neemuch', 'Niwari', 'Panna', 'Raisen',
    'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna',
    'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur',
    'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain',
    'Umaria', 'Vidisha',
  ],
  'Maharashtra': [
    'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed',
    'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli',
    'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur',
    'Latur', 'Mumbai', 'Mumbai Suburban', 'Nagpur', 'Nanded',
    'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani',
    'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
    'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim',
    'Yavatmal',
  ],
  'Manipur': [
    'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
    'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney',
    'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal',
    'Ukhrul',
  ],
  'Meghalaya': [
    'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills',
    'Ri Bhoi', 'Shillong', 'South Garo Hills', 'South West Garo Hills',
    'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills',
  ],
  'Mizoram': [
    'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib',
    'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Saitual',
    'Serchhip',
  ],
  'Nagaland': [
    'Chumoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng',
    'Mokokchung', 'Mon', 'Niuland', 'Noklak', 'Peren',
    'Phek', 'Shamator', 'Tseminyu', 'Tuensang', 'Wokha',
    'Zunheboto',
  ],
  'Odisha': [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Berhampur', 'Bhadrak',
    'Bhubaneswar', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal',
    'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda',
    'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha',
    'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh',
    'Nuapada', 'Puri', 'Rayagada', 'Rourkela', 'Sambalpur',
    'Subarnapur', 'Sundargarh',
  ],
  'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
  'Punjab': [
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib',
    'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar',
    'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga',
    'Mohali', 'Muktsar', 'Nawanshahr', 'Pathankot', 'Patiala',
    'Rupnagar', 'Sangrur', 'Tarn Taran',
  ],
  'Rajasthan': [
    'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer',
    'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh',
    'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh',
    'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu',
    'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali',
    'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi',
    'Sri Ganganagar', 'Tonk', 'Udaipur',
  ],
  'Sikkim': ['East Sikkim', 'Gangtok', 'North Sikkim', 'South Sikkim', 'West Sikkim', 'Pakyong'],
  'Tamil Nadu': [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
    'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram',
    'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
    'Nagapattinam', 'Nagercoil', 'Namakkal', 'Nilgiris', 'Perambalur',
    'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
    'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli',
    'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai',
    'Tiruvarur', 'Trichy', 'Vellore', 'Viluppuram', 'Virudhunagar',
  ],
  'Telangana': [
    'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon',
    'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam',
    'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahbubnagar', 'Mancherial', 'Medak',
    'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet',
    'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy',
    'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy',
    'Warangal', 'Yadadri Bhuvanagiri',
  ],
  'Tripura': [
    'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala',
    'South Tripura', 'Unakoti', 'West Tripura',
  ],
  'Uttar Pradesh': [
    'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha',
    'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich',
    'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly',
    'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr',
    'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah',
    'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad',
    'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur',
    'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi',
    'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi',
    'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj',
    'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut',
    'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Noida', 'Pilibhit',
    'Pratapgarh', 'Prayagraj', 'Rae Bareli', 'Rampur', 'Saharanpur',
    'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti',
    'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao',
    'Varanasi',
  ],
  'Uttarakhand': [
    'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun',
    'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag',
    'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi',
  ],
  'West Bengal': [
    'Alipurduar', 'Asansol', 'Bankura', 'Birbhum', 'Cooch Behar',
    'Dakshin Dinajpur', 'Darjeeling', 'Durgapur', 'Hooghly', 'Howrah',
    'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda',
    'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur',
    'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'Siliguri', 'South 24 Parganas',
    'Uttar Dinajpur',
  ],
};

// Major cities for quick filters (used in DoctorSearchScreen)
export const MAJOR_CITIES = [
  'Agra', 'Ahmedabad', 'Aizawl', 'Ajmer', 'Amritsar',
  'Aurangabad', 'Bangalore', 'Belgaum', 'Berhampur', 'Bhilai',
  'Bhopal', 'Bhubaneswar', 'Bikaner', 'Bokaro', 'Chandigarh',
  'Chennai', 'Coimbatore', 'Cuttack', 'Davangere', 'Dehradun',
  'Dhanbad', 'Dibrugarh', 'Dindigul', 'Erode', 'Faridabad',
  'Gandhinagar', 'Gangtok', 'Ghaziabad', 'Gulbarga', 'Gurugram',
  'Guwahati', 'Gwalior', 'Haridwar', 'Hubli', 'Hyderabad',
  'Imphal', 'Indore', 'Jabalpur', 'Jaipur', 'Jalandhar',
  'Jammu', 'Jamshedpur', 'Jodhpur', 'Jorhat', 'Kakinada',
  'Kannur', 'Kanpur Nagar', 'Karimnagar', 'Khammam', 'Kochi',
  'Kolhapur', 'Kolkata', 'Kota', 'Kozhikode', 'Kurnool',
  'Lucknow', 'Ludhiana', 'Madurai', 'Mangalore', 'Mapusa',
  'Margao', 'Meerut', 'Mumbai', 'Muzaffarpur', 'Mysore',
  'Nagercoil', 'Nagpur', 'Nashik', 'Nellore', 'New Delhi',
  'Nizamabad', 'Noida', 'Panaji', 'Patna', 'Patiala',
  'Prayagraj', 'Pune', 'Raipur', 'Rajkot', 'Ranchi',
  'Rourkela', 'Salem', 'Shillong', 'Shimla', 'Silchar',
  'Siliguri', 'Solapur', 'Srinagar', 'Surat', 'Thanjavur',
  'Thane', 'Thiruvananthapuram', 'Thoothukudi', 'Thrissur', 'Tirunelveli',
  'Tirupati', 'Tiruppur', 'Trichy', 'Udaipur', 'Ujjain',
  'Vadodara', 'Varanasi', 'Vellore', 'Vijayawada', 'Visakhapatnam',
  'Warangal',
];

export default {
  API_BASE_URL,
  API_TIMEOUT,
  USER_ROLES,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUS,
  URGENCY_LEVELS,
  EMERGENCY_STATUS,
  RECORD_TYPES,
  RECORD_STATUS,
  MEDICATION_STATUS,
  CALL_STATUS,
  CONSENT_TYPES,
  CONSENT_STATUS,
  ACCESS_REQUEST_STATUS,
  ACCESS_STATUS,
  API_ERROR_CODES,
  BLOOD_GROUPS,
  GENDERS,
  SPECIALIZATIONS,
  DAYS_OF_WEEK,
  COUNTRY_CODES,
  NOTIFICATION_TYPES,
  ANALYTICS_PERIODS,
  EMERGENCY_SEARCH_RADIUS,
  DEFAULT_SLOT_DURATION,
  CANCELLATION_CUTOFF_HOURS,
  ITEMS_PER_PAGE,
  MAX_IMAGE_SIZE,
  ALLOWED_IMAGE_TYPES,
};
