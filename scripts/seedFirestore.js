/*
  Seed script for Firestore sample data and readiness calculation.
  Run with node (after installing firebase and configuring firebase/config.js)
*/
const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs, addDoc, doc, setDoc } = require('firebase/firestore')
const fs = require('fs')

console.log('This seed helper is a guidance script. For safety run it inside your app runtime.')
