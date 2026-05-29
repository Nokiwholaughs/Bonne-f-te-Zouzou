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

// --- 3. GESTION DE LA VISIONNEUSE ---
const visionneuse = document.getElementById('visionneuse');
const imgVisionneuse = document.getElementById('img-visionneuse');
const btnFermerVisionneuse = document.querySelector('.fermer-visionneuse');

if (btnFermerVisionneuse) {
    btnFermerVisionneuse.addEventListener('click', () => visionneuse.style.display = 'none');
}

if (visionneuse) {
    // Ferme la visionneuse si on clique dans le vide (autour de l'image)
    visionneuse.addEventListener('click', (e) => {
        if(e.target === visionneuse) visionneuse.style.display = 'none';
    });
}

// --- 4. COMPRESSION ET ENVOI MULTIPLE DANS FIRESTORE ---
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
        const fichiers = event.target.files; // Récupère le tableau des fichiers
        if (fichiers.length === 0) return;

        const labelBtn = document.querySelector('label[for="input-photo"]');
        const texteOriginal = labelBtn.innerText;
        labelBtn.innerText = `Envoi de ${fichiers.length} photo(s)...`;

        try {
            // Boucle pour envoyer toutes les photos sélectionnées
            for (let i = 0; i < fichiers.length; i++) {
                const imageBase64 = await compresserImage(fichiers[i]);
                await addDoc(collection(db, "galerie"), {
                    image: imageBase64,
                    date: Date.now() + i // + i pour éviter que deux photos aient la même milliseconde
                });
            }
            
            labelBtn.innerText = "Photos ajoutées !";
            setTimeout(() => labelBtn.innerText = texteOriginal, 3000);
        } catch (e) {
            console.error("Erreur d'envoi : ", e);
            labelBtn.innerText = "Erreur, réessayez.";
        }
    });
}

// --- 5. AFFICHAGE ET SUPPRESSION DES PHOTOS (TEMPS RÉEL) ---
const conteneurPhotos = document.getElementById('conteneur-photos');
if(conteneurPhotos) {
    const requeteGalerie = query(collection(db, "galerie"), orderBy("date", "desc"));

    onSnapshot(requeteGalerie, (snapshot) => {
        conteneurPhotos.innerHTML = ""; 
        snapshot.forEach((documentFirebase) => {
            const data = documentFirebase.data();
            const idPhoto = documentFirebase.id; // L'identifiant unique Firebase de la photo

            // Création du bloc conteneur
            const divWrapper = document.createElement('div');
            divWrapper.classList.add('conteneur-photo');

            // Création de l'image
            const img = document.createElement('img');
            img.src = data.image;
            img.classList.add('img-galerie');
            
            // Clic sur l'image pour l'ouvrir en grand
            img.addEventListener('click', () => {
                imgVisionneuse.src = data.image;
                visionneuse.style.display = 'flex';
            });

            // Création du bouton de suppression
            const btnSupprimer = document.createElement('button');
            btnSupprimer.classList.add('btn-supprimer');
            btnSupprimer.innerHTML = '&times;'; // Symbole "X"
            btnSupprimer.title = "Supprimer cette photo";

            // Clic sur le bouton de suppression
            btnSupprimer.addEventListener('click', async (e) => {
                e.stopPropagation(); // Empêche l'ouverture de la visionneuse quand on clique sur supprimer
                const confirmation = confirm("Veux-tu vraiment supprimer cette photo ?");
                if (confirmation) {
                    await deleteDoc(doc(db, "galerie", idPhoto)); // Suppression via l'ID
                }
            });

            // Assemblage
            divWrapper.appendChild(img);
            divWrapper.appendChild(btnSupprimer);
            conteneurPhotos.appendChild(divWrapper);
        });
    });
}

// --- 6. GESTION ET AFFICHAGE DES MOTS DOUX ---
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
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
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
