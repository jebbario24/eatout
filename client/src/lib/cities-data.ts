// Major cities by country for delivery zone selection
// This is a curated list of major cities. Users can also enter custom cities.

export interface CityData {
  [countryCode: string]: string[];
}

export const MAJOR_CITIES: CityData = {
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte", "San Francisco", "Indianapolis", "Seattle", "Denver", "Washington DC", "Boston", "El Paso", "Nashville", "Detroit", "Portland", "Memphis", "Oklahoma City", "Las Vegas", "Louisville", "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento", "Kansas City", "Atlanta", "Miami", "Orlando"],
  CA: ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener", "London", "Victoria", "Halifax", "Oshawa", "Windsor", "Saskatoon", "Regina", "St. John's"],
  GB: ["London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Newcastle", "Sheffield", "Bristol", "Edinburgh", "Glasgow", "Cardiff", "Belfast", "Leicester", "Nottingham", "Coventry", "Brighton"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Newcastle", "Wollongong", "Hobart", "Darwin", "Cairns"],
  IN: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Thiruvananthapuram"],
  CN: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Chongqing", "Tianjin", "Wuhan", "Hangzhou", "Xi'an", "Suzhou", "Zhengzhou", "Nanjing", "Shenyang", "Dongguan", "Qingdao", "Dalian", "Ningbo", "Jinan", "Harbin", "Changchun", "Kunming", "Shijiazhuang", "Hefei", "Taiyuan", "Urumqi", "Lanzhou", "Xiamen", "Nanchang"],
  BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre", "Belém", "Goiânia", "Guarulhos", "Campinas", "São Luís", "São Gonçalo", "Maceió", "Duque de Caxias", "Teresina", "Natal"],
  MX: ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "León", "Juárez", "Zapopan", "Mérida", "San Luis Potosí", "Aguascalientes", "Hermosillo", "Saltillo", "Mexicali", "Culiacán", "Querétaro", "Chihuahua", "Morelia", "Torreón", "Acapulco"],
  DE: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund", "Essen", "Leipzig", "Bremen", "Dresden", "Hanover", "Nuremberg", "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon", "Grenoble", "Dijon", "Nîmes", "Angers", "Villeurbanne"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Bari", "Catania", "Venice", "Verona", "Messina", "Padua", "Trieste", "Brescia", "Taranto", "Prato", "Parma", "Modena"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón", "Hospitalet de Llobregat", "A Coruña", "Granada", "Vitoria-Gasteiz", "Elche"],
  RU: ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Nizhny Novgorod", "Kazan", "Chelyabinsk", "Omsk", "Samara", "Rostov-on-Don", "Ufa", "Krasnoyarsk", "Perm", "Voronezh", "Volgograd", "Krasnodar", "Saratov", "Tyumen", "Tolyatti", "Izhevsk"],
  JP: ["Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kyoto", "Kawasaki", "Saitama", "Hiroshima", "Sendai", "Kitakyushu", "Chiba", "Sakai", "Niigata", "Hamamatsu", "Okayama", "Sagamihara", "Shizuoka"],
  KR: ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Suwon", "Ulsan", "Changwon", "Goyang", "Yongin", "Seongnam", "Bucheon", "Cheongju", "Ansan", "Jeonju", "Anyang", "Pohang", "Uijeongbu", "Gimhae"],
  AR: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata", "San Miguel de Tucumán", "Mar del Plata", "Salta", "Santa Fe", "San Juan", "Resistencia", "Santiago del Estero", "Corrientes", "Bahía Blanca", "Posadas", "Paraná", "Neuquén", "Formosa", "San Salvador de Jujuy", "La Rioja"],
  ZA: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "East London", "Nelspruit", "Kimberley", "Polokwane", "Pietermaritzburg", "George", "Rustenburg", "Welkom", "Klerksdorp", "Witbank", "Middelburg", "Vereeniging", "Bhisho", "Mafikeng"],
  NG: ["Lagos", "Kano", "Ibadan", "Abuja", "Port Harcourt", "Benin City", "Kaduna", "Maiduguri", "Zaria", "Aba", "Jos", "Ilorin", "Oyo", "Enugu", "Abeokuta", "Sokoto", "Onitsha", "Warri", "Ebute Ikorodu", "Okene"],
  EG: ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez", "Luxor", "Mansoura", "El-Mahalla El-Kubra", "Tanta", "Asyut", "Ismailia", "Faiyum", "Zagazig", "Aswan", "Damietta", "Damanhur", "Minya", "Beni Suef", "Qena"],
  PH: ["Manila", "Quezon City", "Davao City", "Caloocan", "Cebu City", "Zamboanga City", "Taguig", "Antipolo", "Pasig", "Cagayan de Oro", "Parañaque", "Valenzuela", "Dasmariñas", "Las Piñas", "General Santos", "Makati", "Bacolod", "Muntinlupa", "San Jose del Monte", "Iloilo City"],
  VN: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Hai Phong", "Bien Hoa", "Nha Trang", "Can Tho", "Hue", "Vung Tau", "Buon Ma Thuot", "Quy Nhon", "Phan Thiet", "Da Lat", "Long Xuyen", "Thai Nguyen", "Cam Ranh", "Vinh", "My Tho", "Rach Gia", "Cao Lanh"],
  TH: ["Bangkok", "Samut Prakan", "Mueang Nonthaburi", "Udon Thani", "Chon Buri", "Nakhon Ratchasima", "Chiang Mai", "Hat Yai", "Pak Kret", "Si Racha", "Phra Pradaeng", "Lampang", "Khon Kaen", "Surat Thani", "Phuket", "Nakhon Si Thammarat", "Ubon Ratchathani", "Rayong", "Nakhon Pathom", "Sakon Nakhon"],
  TR: ["Istanbul", "Ankara", "Izmir", "Bursa", "Adana", "Gaziantep", "Konya", "Antalya", "Diyarbakır", "Mersin", "Kayseri", "Eskişehir", "Şanlıurfa", "Samsun", "Denizli", "Adapazarı", "Malatya", "Kahramanmaraş", "Erzurum", "Van"],
  PL: ["Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin", "Bydgoszcz", "Lublin", "Katowice", "Białystok", "Gdynia", "Częstochowa", "Radom", "Sosnowiec", "Toruń", "Kielce", "Gliwice", "Zabrze", "Bytom"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen", "Enschede", "Haarlem", "Arnhem", "Amersfoort", "Zaanstad", "Apeldoorn", "'s-Hertogenbosch", "Hoofddorp", "Maastricht", "Leiden"],
  BE: ["Brussels", "Antwerp", "Ghent", "Charleroi", "Liège", "Bruges", "Namur", "Leuven", "Mons", "Aalst", "Mechelen", "La Louvière", "Kortrijk", "Hasselt", "Ostend", "Sint-Niklaas", "Tournai", "Genk", "Seraing", "Roeselare"],
  SE: ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping", "Helsingborg", "Jönköping", "Norrköping", "Lund", "Umeå", "Gävle", "Borås", "Södertälje", "Eskilstuna", "Halmstad", "Växjö", "Karlstad", "Sundsvall"],
  NO: ["Oslo", "Bergen", "Stavanger", "Trondheim", "Drammen", "Fredrikstad", "Kristiansand", "Sandnes", "Tromsø", "Sarpsborg", "Skien", "Ålesund", "Sandefjord", "Haugesund", "Tønsberg", "Moss", "Bodø", "Arendal", "Hamar", "Ytrebygda"],
  DK: ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers", "Kolding", "Horsens", "Vejle", "Roskilde", "Herning", "Hørsholm", "Silkeborg", "Næstved", "Fredericia", "Viborg", "Køge", "Holstebro", "Taastrup", "Slagelse"],
  FI: ["Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku", "Jyväskylä", "Lahti", "Kuopio", "Pori", "Joensuu", "Lappeenranta", "Hämeenlinna", "Vaasa", "Seinäjoki", "Rovaniemi", "Mikkeli", "Kotka", "Salo", "Porvoo"],
  CH: ["Zürich", "Geneva", "Basel", "Lausanne", "Bern", "Winterthur", "Lucerne", "St. Gallen", "Lugano", "Biel/Bienne", "Thun", "Köniz", "La Chaux-de-Fonds", "Schaffhausen", "Fribourg", "Vernier", "Chur", "Neuchâtel", "Uster", "Sion"],
  AT: ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach", "Wels", "Sankt Pölten", "Dornbirn", "Steyr", "Wiener Neustadt", "Feldkirch", "Bregenz", "Leonding", "Klosterneuburg", "Baden", "Wolfsberg", "Leoben", "Krems"],
  PT: ["Lisbon", "Porto", "Vila Nova de Gaia", "Amadora", "Braga", "Funchal", "Coimbra", "Setúbal", "Almada", "Agualva-Cacém", "Queluz", "Rio Tinto", "Barreiro", "Evora", "Aveiro", "Corroios", "Odivelas", "Loures", "Matosinhos", "Guimarães"],
  GR: ["Athens", "Thessaloniki", "Patras", "Heraklion", "Larissa", "Volos", "Rhodes", "Ioannina", "Chania", "Chalcis", "Agrinio", "Katerini", "Kalamata", "Kavala", "Lamia", "Serres", "Drama", "Veria", "Alexandroupoli", "Xanthi"],
  CZ: ["Prague", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc", "České Budějovice", "Hradec Králové", "Ústí nad Labem", "Pardubice", "Zlín", "Havířov", "Kladno", "Most", "Opava", "Frýdek-Místek", "Jihlava", "Karviná", "Teplice", "Děčín"],
  HU: ["Budapest", "Debrecen", "Szeged", "Miskolc", "Pécs", "Győr", "Nyíregyháza", "Kecskemét", "Székesfehérvár", "Szombathely", "Szolnok", "Tatabánya", "Kaposvár", "Érd", "Veszprém", "Békéscsaba", "Zalaegerszeg", "Sopron", "Eger", "Nagykanizsa"],
  RO: ["Bucharest", "Cluj-Napoca", "Timișoara", "Iași", "Constanța", "Craiova", "Brașov", "Galați", "Ploiești", "Oradea", "Brăila", "Arad", "Pitești", "Sibiu", "Bacău", "Târgu Mureș", "Baia Mare", "Buzău", "Botoșani", "Satu Mare"],
  IL: ["Tel Aviv", "Jerusalem", "Haifa", "Rishon LeZion", "Petah Tikva", "Ashdod", "Netanya", "Beersheba", "Holon", "Bnei Brak", "Ramat Gan", "Ashkelon", "Rehovot", "Bat Yam", "Beit Shemesh", "Kfar Saba", "Herzliya", "Hadera", "Modi'in-Maccabim-Re'ut", "Nazareth"],
  AE: ["Dubai", "Abu Dhabi", "Sharjah", "Al Ain", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Khor Fakkan", "Kalba", "Dibba Al-Fujairah", "Dibba Al-Hisn", "Madinat Zayed", "Ruwais", "Liwa Oasis", "Ghayathi", "Al Dhafra", "Jebel Ali", "Al Quoz", "Deira"],
  SA: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Tabuk", "Buraidah", "Khamis Mushait", "Hail", "Hafar Al-Batin", "Jubail", "Al-Ahsa", "Najran", "Yanbu", "Abha", "Taif", "Qatif", "Sakakah", "Jizan"],
  MY: ["Kuala Lumpur", "George Town", "Ipoh", "Johor Bahru", "Shah Alam", "Kuching", "Kota Kinabalu", "Petaling Jaya", "Malacca City", "Klang", "Seremban", "Kuantan", "Subang Jaya", "Alor Setar", "Muar", "Kangar", "Kota Bharu", "Kuala Terengganu", "Sandakan", "Miri"],
  SG: ["Singapore"],
  NZ: ["Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Napier-Hastings", "Dunedin", "Palmerston North", "Nelson", "Rotorua", "New Plymouth", "Whangarei", "Invercargill", "Whanganui", "Gisborne"],
  IE: ["Dublin", "Cork", "Limerick", "Galway", "Waterford", "Drogheda", "Dundalk", "Swords", "Bray", "Navan", "Ennis", "Kilkenny", "Carlow", "Tralee", "Newbridge", "Naas", "Athlone", "Portlaoise", "Mullingar", "Wexford"],
  CL: ["Santiago", "Puente Alto", "Antofagasta", "Viña del Mar", "Valparaíso", "Talcahuano", "San Bernardo", "Temuco", "Concepción", "Rancagua", "Talca", "Arica", "Chillán", "Iquique", "Los Ángeles", "Puerto Montt", "Coquimbo", "Osorno", "Valdivia", "Punta Arenas"],
  CO: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Cúcuta", "Bucaramanga", "Pereira", "Santa Marta", "Ibagué", "Pasto", "Manizales", "Neiva", "Soledad", "Villavicencio", "Armenia", "Soacha", "Valledupar", "Montería", "Itagüí"],
  PE: ["Lima", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Iquitos", "Cusco", "Huancayo", "Chimbote", "Tacna", "Juliaca", "Ica", "Sullana", "Ayacucho", "Chincha Alta", "Huánuco", "Cajamarca", "Pucallpa", "Tarapoto", "Puno"],
  VE: ["Caracas", "Maracaibo", "Valencia", "Barquisimeto", "Maracay", "Barcelona", "Maturín", "Ciudad Guayana", "Ciudad Bolívar", "Cumaná", "Mérida", "San Cristóbal", "Cabimas", "Turmero", "Barinas", "Punto Fijo", "Los Teques", "Guanare", "Puerto La Cruz", "Acarigua"],
  EC: ["Guayaquil", "Quito", "Cuenca", "Santo Domingo", "Machala", "Durán", "Portoviejo", "Manta", "Loja", "Ambato", "Esmeraldas", "Quevedo", "Riobamba", "Milagro", "Ibarra", "La Libertad", "Babahoyo", "Sangolquí", "Daule", "Latacunga"],
  CR: ["San José", "Limón", "Alajuela", "Heredia", "Cartago", "Puntarenas", "Liberia", "Paraíso", "Pococí", "San Carlos", "Desamparados", "Pérez Zeledón", "Aserrí", "San Ramón", "Grecia", "Puriscal", "Siquirres", "Naranjo", "Turrialba", "San Isidro"],
  PA: ["Panama City", "San Miguelito", "Tocumen", "David", "Arraiján", "Colón", "La Chorrera", "Pacora", "Santiago", "Chitré", "Chilibre", "Las Cumbres", "Penonomé", "La Concepción", "Aguadulce", "Bugaba", "Chepo", "Los Santos", "Pedregal", "Veraguas"],
  BD: ["Dhaka", "Chittagong", "Khulna", "Rajshahi", "Sylhet", "Rangpur", "Barisal", "Mymensingh", "Comilla", "Narayanganj", "Gazipur", "Tongi", "Narsingdi", "Jessore", "Bogra", "Dinajpur", "Cox's Bazar", "Kushtia", "Sirajganj", "Tangail"],
  PK: ["Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Multan", "Hyderabad", "Gujranwala", "Peshawar", "Quetta", "Islamabad", "Sargodha", "Sialkot", "Bahawalpur", "Sukkur", "Jhang", "Sheikhupura", "Larkana", "Gujrat", "Mardan", "Kasur"],
  KE: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Ruiru", "Kikuyu", "Kangundo-Tala", "Malindi", "Naivasha", "Kitui", "Machakos", "Thika", "Athi River", "Karuri", "Nyeri", "Meru", "Kakamega", "Bungoma", "Kericho"],
};

// Get cities for a country code, returns empty array if not found
export function getCitiesByCountry(countryCode: string): string[] {
  return MAJOR_CITIES[countryCode] || [];
}

// Check if a country has cities in the data
export function hasPreloadedCities(countryCode: string): boolean {
  return countryCode in MAJOR_CITIES && MAJOR_CITIES[countryCode].length > 0;
}
