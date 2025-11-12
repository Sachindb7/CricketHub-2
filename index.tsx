import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Outlet, Link, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, limit } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// @ts-ignore: Allow imports from URLs
// --- Firebase Config & Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyAKwOw7H40psr-DrGpaZaNmNJK9jRxhNLU",
  authDomain: "crickethub-1c169.firebaseapp.com",
  projectId: "crickethub-1c169",
  storageBucket: "crickethub-1c169.appspot.com",
  messagingSenderId: "377931902841",
  appId: "1:377931902841:web:f228dbaf437e426f8149a8",
  measurementId: "G-422P4QG1NB"
};

// Fix for: Cannot find name 'Quill'.
declare var Quill: any;

// Fix for: Property 'gtag' does not exist on type 'Window & typeof globalThis'.
declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
  }
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const postsCollectionRef = collection(db, 'posts');

// --- Helper Functions ---
const slugify = (text: string): string => {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

// --- SEO Helper Functions ---
const setMetaTag = (attr: string, attrValue: string, content: string) => {
    const head = document.head;
    let element = head.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement;
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, attrValue);
        head.appendChild(element);
    }
    element.setAttribute('content', content);
};

const setLinkTag = (rel: string, href: string) => {
    const head = document.head;
    let element = head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
    if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        head.appendChild(element);
    }
    element.setAttribute('href', href);
};

const setStructuredData = (data: object) => {
    const head = document.head;
    let element = head.querySelector('script[type="application/ld+json"]');
    if (!element) {
        element = document.createElement('script');
        element.setAttribute('type', 'application/ld+json');
        head.appendChild(element);
    }
    element.textContent = JSON.stringify(data);
};

const removeMetaTagByAttr = (attr: string, attrValue: string) => {
    const element = document.head.querySelector(`meta[${attr}="${attrValue}"]`);
    if (element) element.remove();
};

const removeStructuredData = () => {
    const element = document.head.querySelector('script[type="application/ld+json"]');
    if (element) element.remove();
};

// --- Blog Service (Firebase Implementation) ---
const getPosts = async (): Promise<any[]> => {
    const q = query(postsCollectionRef, orderBy('date', 'desc'));
    const data = await getDocs(q);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

const getPostById = async (id: string): Promise<any | undefined> => {
    const postDoc = doc(db, 'posts', id);
    const docSnap = await getDoc(postDoc);
    return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } : undefined;
};

const getPostBySlug = async (slug: string): Promise<any | undefined> => {
    const q = query(postsCollectionRef, where("slug", "==", slug), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return { ...docSnap.data(), id: docSnap.id };
    } else {
        // Fallback for old posts: if no post is found by slug, the "slug" might be an ID.
        return getPostById(slug);
    }
};

const addPost = async (postData: any): Promise<any> => {
    const newPost = { ...postData, date: new Date().toISOString() };
    const docRef = await addDoc(postsCollectionRef, newPost);
    return { ...newPost, id: docRef.id };
};

const updatePost = async (id: string, postData: any): Promise<any> => {
    const postDoc = doc(db, 'posts', id);
    await updateDoc(postDoc, postData);
    return { ...postData, id };
};

const deletePost = async (id: string): Promise<boolean> => {
    const postDoc = doc(db, 'posts', id);
    await deleteDoc(postDoc);
    return true;
};


// --- Components ---
const AdPlaceholder = ({ label, width = '100%', height = '90px' }: {label: string, width?: string, height?: string}) => {
  // This component is hidden by default via CSS in the <head>.
  // To make it visible for development, find the ".ad-placeholder" rule 
  // and change "display: none" to "display: flex".
  return (
    <div
      className="ad-placeholder my-8 items-center justify-center bg-gray-200 border-2 border-dashed border-gray-400"
      style={{ width, minHeight: height }}
      aria-hidden="true" // Hide from screen readers as it's not visible
    >
      <span className="text-gray-500 font-medium">{label}</span>
    </div>
  );
};

const Header = () => {
  const activeLinkStyle = { color:'#3B82F6', textDecoration:'underline' };
  return (
    <header className="bg-neutral shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
        <Link to="/" className="text-2xl font-bold text-white hover:text-accent transition-colors">Cricket Hub</Link>
        <nav className="hidden md:flex items-center space-x-4">
          <NavLink to="/" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium" style={({isActive})=>isActive?activeLinkStyle:undefined}>Home</NavLink>
          <NavLink to="/about" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium" style={({isActive})=>isActive?activeLinkStyle:undefined}>About</NavLink>
        </nav>
      </div>
    </header>
  );
};

const Footer = () => (
    <footer className="bg-neutral text-white mt-auto">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center space-x-6 mb-4">
                <Link to="/about" className="text-sm text-gray-400 hover:text-white">About Us</Link>
                <Link to="/contact" className="text-sm text-gray-400 hover:text-white">Contact Us</Link>
                <Link to="/privacy" className="text-sm text-gray-400 hover:text-white">Privacy Policy</Link>
            </div>
            <p>&copy; {new Date().getFullYear()} Cricket Hub. All rights reserved.</p>
        </div>
    </footer>
);

const PostCard = ({post}: {post: any})=>(
  <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
    <Link to={`/post/${post.slug || post.id}`} className="block">
      <img className="w-full h-48 object-cover" src={post.imageUrl} alt={post.title} />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2 text-neutral hover:text-primary">{post.title}</h2>
        <p className="text-gray-500 text-sm mb-4">By {post.author} on {new Date(post.date).toLocaleDateString()}</p>
        <p className="text-gray-700 leading-relaxed">{post.excerpt}</p>
      </div>
    </Link>
  </div>
);

const PostList = () => {
  const [posts,setPosts]=useState<any[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    document.title = 'Cricket Hub - Latest Articles and News';
    setMetaTag('name', 'description', 'Your one-stop destination for the latest cricket news, articles, match analysis, and player insights. Stay updated with Cricket Hub.');
    setMetaTag('property', 'og:title', 'Cricket Hub - Latest Articles and News');
    setMetaTag('property', 'og:description', 'Your one-stop destination for the latest cricket news, articles, match analysis, and player insights.');
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:url', window.location.origin);
    setMetaTag('property', 'og:image', 'https://picsum.photos/seed/crickethub/1200/630');
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setLinkTag('canonical', window.location.origin);
    removeStructuredData();
    removeMetaTagByAttr('name', 'robots'); // Ensure admin 'noindex' is removed

    const fetchPosts=async()=>{ setLoading(true); const data=await getPosts(); setPosts(data); setLoading(false); };
    fetchPosts();
  },[]);

  if(loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div></div>;

  const postsWithAds = posts.reduce<React.ReactNode[]>((acc, post, index) => {
    acc.push(<PostCard key={post.id} post={post}/>);
    // Insert an in-feed ad after the 3rd post, 6th, etc.
    if ((index + 1) % 3 === 0 && index < posts.length - 1) {
      acc.push(
        <div key={`ad-wrapper-${index}`} className="md:col-span-2 lg:col-span-3">
          <AdPlaceholder label={`In-feed Ad #${(index + 1) / 3}`} />
        </div>
      );
    }
    return acc;
  }, []);

  return (
    <div>
      <AdPlaceholder label="Homepage Top Banner" />
      <h1 className="text-4xl font-extrabold text-center mb-12 text-neutral">Latest Articles</h1>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">{postsWithAds}</div>
    </div>
  );
};

const PostDetail = () => {
  const {slug}=useParams<{slug: string}>(); const [post,setPost]=useState<any>(null); const [loading,setLoading]=useState(true);
  
  useEffect(()=>{
    if(slug){
      const fetchPost=async()=>{ setLoading(true); const data=await getPostBySlug(slug); setPost(data || null); setLoading(false); };
      fetchPost();
    }
    return () => {
      removeStructuredData();
      removeMetaTagByAttr('name', 'keywords');
    };
  },[slug]);

  useEffect(() => {
    if (post) {
      const postUrl = `${window.location.origin}/post/${post.slug || post.id}`;
      const description = post.metaDescription || post.excerpt;
      
      document.title = `${post.title} | Cricket Hub`;
      setMetaTag('name', 'description', description);
      setMetaTag('property', 'og:title', post.title);
      setMetaTag('property', 'og:description', description);
      setMetaTag('property', 'og:type', 'article');
      setMetaTag('property', 'og:url', postUrl);
      setMetaTag('property', 'og:image', post.imageUrl);
      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setLinkTag('canonical', postUrl);
      removeMetaTagByAttr('name', 'robots');

      if (post.metaKeywords) {
        setMetaTag('name', 'keywords', post.metaKeywords);
      }

      setStructuredData({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "image": post.imageUrl,
        "datePublished": post.date,
        "author": {
          "@type": "Person",
          "name": post.author
        },
        "publisher": {
          "@type": "Organization",
          "name": "Cricket Hub",
          "logo": {
            "@type": "ImageObject",
            "url": "https://picsum.photos/seed/crickethub-logo/600/60"
          }
        },
        "description": description
      });
    }
  }, [post]);

  if(loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div></div>;
  
  if(!post) {
    document.title = 'Post Not Found | Cricket Hub';
    setMetaTag('name', 'robots', 'noindex');
    return <div className="text-center py-10"><h2 className="text-2xl font-bold">Post not found</h2><Link to="/" className="text-primary hover:underline mt-4 inline-block">Back to Home</Link></div>;
  }
  
  return (
    <article className="max-w-4xl mx-auto bg-white p-6 sm:p-8 lg:p-12 rounded-lg shadow-xl">
      <img className="w-full h-64 md:h-96 object-cover rounded-md mb-8" src={post.imageUrl} alt={post.title} />
      <h1 className="text-4xl md:text-5xl font-extrabold text-neutral mb-4 leading-tight">{post.title}</h1>
      <p className="text-gray-500 mb-8">By <span className="font-semibold">{post.author}</span> on {new Date(post.date).toLocaleDateString()}</p>
      
      <AdPlaceholder label="Article Top Banner" />

      <div className="prose lg:prose-xl max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: post.content }}></div>
      
      <AdPlaceholder label="Article Bottom Banner" />

      <div className="mt-12 border-t pt-8"><Link to="/" className="text-primary hover:text-secondary font-semibold transition-colors">&larr; Back to all articles</Link></div>
    </article>
  );
};

// --- Static Pages ---
const StaticPage = ({ title, children }: { title: string, children: React.ReactNode }) => {
    useEffect(() => {
        document.title = `${title} | Cricket Hub`;
        setMetaTag('name', 'robots', 'noindex, follow'); // Good for these pages
        return () => removeMetaTagByAttr('name', 'robots');
    }, [title]);

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 lg:p-12 rounded-lg shadow-xl">
            <h1 className="text-4xl font-extrabold text-neutral mb-6">{title}</h1>
            <div className="prose lg:prose-lg max-w-none text-gray-800">
                {children}
            </div>
        </div>
    );
};

const AboutPage = () => (
    <StaticPage title="About Us">
        <p>Welcome to Cricket Hub, your number one source for all things cricket. We're dedicated to giving you the very best of cricket news, with a focus on in-depth analysis, player statistics, and behind-the-scenes stories.</p>
        <p>Founded in {new Date().getFullYear()} by a passionate cricket fan, Cricket Hub has come a long way from its beginnings. When we first started out, our passion for the sport drove us to start our own blog.</p>
        <p>We hope you enjoy our articles as much as we enjoy offering them to you. If you have any questions or comments, please don't hesitate to contact us.</p>
        <p>Sincerely,</p>
        <p>The Cricket Hub Team</p>
    </StaticPage>
);

const ContactPage = () => (
    <StaticPage title="Contact Us">
        <p>We'd love to hear from you! Whether you have a question, a suggestion, or just want to talk about cricket, feel free to reach out.</p>
        <p>You can contact us via email at: <a href="mailto:contact@crickethub.co.in" className="text-primary hover:underline">contact@crickethub.co.in</a></p>
        <p>You can also follow us on our social media channels to stay updated with the latest content.</p>
        {/* Add social media links here when you have them */}
    </StaticPage>
);

const PrivacyPolicyPage = () => (
    <StaticPage title="Privacy Policy">
        <p>Your privacy is important to us. It is Cricket Hub's policy to respect your privacy regarding any information we may collect from you across our website, https://crickethub.co.in, and other sites we own and operate.</p>
        <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
        <p>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.</p>
        <p>We don’t share any personally identifying information publicly or with third-parties, except when required to by law.</p>
        <p>Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.</p>
        <p>Your continued use of our website will be regarded as acceptance of our practices around privacy and personal information. If you have any questions about how we handle user data and personal information, feel free to contact us.</p>
        <p>This policy is effective as of {new Date().toLocaleDateString()}.</p>
    </StaticPage>
);

// --- Admin Login ---
const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [seq, setSeq] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    document.title = 'Admin Login | Cricket Hub';
    setMetaTag('name', 'robots', 'noindex, nofollow');
  }, []);

  useEffect(()=>{
    if(showLogin) return;
    let timeoutId: number;
    const handleKeyDown=(e: KeyboardEvent)=>{
      if(e.key.length>1){ setSeq(''); return; }
      const newSeq = (seq+e.key.toLowerCase()).slice(-10);
      setSeq(newSeq);
      if(newSeq==='cricadmin'){ setShowLogin(true); }
      clearTimeout(timeoutId);
      timeoutId=window.setTimeout(()=>setSeq(''),2000);
    };
    window.addEventListener('keydown',handle