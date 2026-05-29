// --- 1. GESTION DE LA NAVIGATION (Placée en haut pour garantir le clic) ---
window.afficherSection = function(idSection) {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    const boutons = document.querySelectorAll('.nav-btn');
    boutons.forEach(bouton => {
        bouton.classList.remove('active');
    });

    const sectionActive = document.getElementById(idSection);
    if (sectionActive) {
        sectionActive.style.display = 'block';
        setTimeout(() => sectionActive.classList.add('active'), 10);
    }

    const boutonActif = document.getElementById('btn-' + idSection);
    if (boutonActif) {
        boutonActif.classList.add('active');
    }
}

// --- 2. INITIALISATION DE FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9eIIkP1h_a0BNFP4zZWY4JM7gPA6Ay7c",
  authDomain: "cadeau-zouzou.firebaseapp.com",
  projectId: "cadeau-zouzou",
  storageBucket: "cadeau-zouzou.firebasestorage.app",
  messagingSenderId: "738338937057",
  appId: "1:738338937057:web:7d9f6d11a883bb3556bfa0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 3. COMPRESSION ET ENVOI DES PHOTOS DANS FIRESTORE ---
const inputPhoto = document.getElementById('input-photo');

function compresserImage(fichier, maxSize = 600) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(fichier);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                } else {
                    if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

if(inputPhoto) {
    inputPhoto.addEventListener('change', async function(event) {
        const fichier = event.target.files[0];
        if (!fichier) return;

        const labelBtn = document.querySelector('label[for="input-photo"]');
        const texteOriginal = labelBtn.innerText;
        labelBtn.innerText = "Envoi en cours...";

        try {
            const imageBase64 = await compresserImage(fichier);
            
            await addDoc(collection(db, "galerie"), {
                image: imageBase64,
                date: Date.now()
            });
            
            labelBtn.innerText = "Photo ajoutée !";
            setTimeout(() => labelBtn.innerText = texteOriginal, 3000);
        } catch (e) {
            console.error("Erreur d'envoi : ", e);
            labelBtn.innerText = "Erreur, réessayez.";
        }
    });
}

// --- 4. AFFICHAGE DES PHOTOS (TEMPS RÉEL) ---
const conteneurPhotos = document.getElementById('conteneur-photos');
if(conteneurPhotos) {
    const requeteGalerie = query(collection(db, "galerie"), orderBy("date", "desc"));

    onSnapshot(requeteGalerie, (snapshot) => {
        conteneurPhotos.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const data = doc.data();
            const img = document.createElement('img');
            img.src = data.image;
            img.classList.add('img-galerie');
            conteneurPhotos.appendChild(img);
        });
    });
}

// --- 5. GESTION ET AFFICHAGE DES MOTS DOUX (TEMPS RÉEL) ---
const formMessage = document.getElementById('form-message');
const listeMessages = document.getElementById('liste-messages');

if(formMessage) {
    formMessage.addEventListener('submit', async function(event) {
        event.preventDefault(); 
        
        const bouton = formMessage.querySelector('button');
        bouton.innerText = "Publication...";

        const nom = document.getElementById('nom-expediteur').value;
        const texte = document.getElementById('texte-message').value;

        try {
            await addDoc(collection(db, "messages"), {
                nom: nom,
                texte: texte,
                date: Date.now()
            });
            formMessage.reset();
            bouton.innerText = "Publier le message";
        } catch (e) {
            console.error("Erreur de publication : ", e);
        }
    });
}

if(listeMessages) {
    const requeteMessages = query(collection(db, "messages"), orderBy("date", "desc"));

    onSnapshot(requeteMessages, (snapshot) => {
        listeMessages.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const data = doc.data();
            const div = document.createElement('div');
            div.classList.add('message-carte');
            div.innerHTML = `
                <strong>${data.nom}</strong>
                <p>${data.texte}</p>
            `;
            listeMessages.appendChild(div);
        });
    });
}