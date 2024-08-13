import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Login from './components/Login';
import { db } from './firebase'; // Importar la configuración de Firebase
import { collection, addDoc, getDocs, doc, setDoc, getDoc } from "firebase/firestore"; 

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [notification, setNotification] = useState(null); // New state for notification

  const categories = [
    'Impuestos', 'Jose', 'Laureno', 'Manuel', 'Santiago', 'Aramis', 
    'Matias', 'Ezequiel', 'Ailen', 'Tamara', 'Gaston', 'Tony', 'Oscar', 'Otros'
  ];

  const formatAmount = (num) => {
    const [integerPart, decimalPart] = num.toFixed(2).split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInteger},${decimalPart}`;
  };

  const initializeCounter = useCallback(async () => {
    const counterDocRef = doc(db, "counters", "transactionCounter");
    const counterDoc = await getDoc(counterDocRef);

    if (!counterDoc.exists()) {
      await setDoc(counterDocRef, { lastId: 0 }); // Inicializar con 0
    }
  }, []);

  const getNextId = useCallback(async () => {
    const counterDocRef = doc(db, "counters", "transactionCounter");
    const counterDoc = await getDoc(counterDocRef);
    
    if (counterDoc.exists()) {
      const lastId = counterDoc.data().lastId;
      const nextId = lastId + 1; // Incrementar el ID

      // Actualizar el contador en Firestore
      await setDoc(counterDocRef, { lastId: nextId });
      return nextId; // Devolver el nuevo ID
    } else {
      throw new Error("Counter document not found");
    }
  }, []);

  const updateBalance = useCallback((transactions) => {
    const total = transactions.reduce((acc, transaction) => {
      return transaction.type === 'expense' ? acc - transaction.amount : acc + transaction.amount;
    }, 0);
    setBalance(total);
  }, []);

  const fetchTransactions = useCallback(async () => {
    const querySnapshot = await getDocs(collection(db, "transactions"));
    const fetchedTransactions = [];
    querySnapshot.forEach((doc) => {
      fetchedTransactions.push({ id: doc.id, ...doc.data() });
    });
    // Ordenar las transacciones por ID
    fetchedTransactions.sort((a, b) => a.id - b.id);
    setTransactions(fetchedTransactions);
    updateBalance(fetchedTransactions);
  }, [updateBalance]);

  useEffect(() => {
    const init = async () => {
      if (isLoggedIn) {
        await initializeCounter();
        fetchTransactions();
      }
    };
    init();
  }, [isLoggedIn, initializeCounter, fetchTransactions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (!isNaN(numericAmount) && numericAmount > 0) {
      try {
        const newId = await getNextId(); // Obtener el nuevo ID
        const newTransaction = {
          id: newId, // Asignar el nuevo ID
          type,
          amount: numericAmount,
          category: type === 'expense' ? category : 'Entrada',
          comment,
          date: new Date().toLocaleString()
        };

        // Agregar la nueva transacción a Firestore
        await addDoc(collection(db, "transactions"), newTransaction);
        setTransactions(prev => {
          // Ordenar las transacciones después de añadir una nueva
          const updatedTransactions = [...prev, newTransaction];
          updatedTransactions.sort((a, b) => a.id - b.id);
          return updatedTransactions;
        });

        updateBalance([...transactions, newTransaction]);

        // Set notification
        setNotification(`${type === 'expense' ? 'Gasto' : 'Entrada'} agregado correctamente`);
        
        // Clear notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);

        // Limpiar los campos después de agregar la transacción
        setAmount('');
        setCategory('');
        setComment('');
      } catch (error) {
        console.error("Error al agregar la transacción:", error);
        setNotification('Hubo un error al agregar la transacción. Intenta de nuevo.');
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="App">
      <h1>Gestor de Gastos</h1>
      {notification && <div className="notification">{notification}</div>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Monto:</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ appearance: 'none' }}
          />
        </div>
        <div>
          <label>Tipo:</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Gasto</option>
            <option value="income">Entrada</option>
          </select>
        </div>
        {type === 'expense' && (
          <div>
            <label>Categoría:</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">Selecciona una categoría</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label>Comentario (opcional):</label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Agrega un comentario..."
          />
        </div>
        <button type="submit" className="animated-button">Agregar</button>
      </form>
      <h2>Balance: ${formatAmount(balance)}</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Categoría</th>
            <th>Comentario</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td data-label="ID">{transaction.id}</td>
              <td data-label="Fecha">{transaction.date}</td>
              <td data-label="Tipo">{transaction.type === 'expense' ? 'Gasto' : 'Entrada'}</td>
              <td data-label="Categoría">{transaction.category}</td>
              <td data-label="Comentario">{transaction.comment || '---'}</td>
              <td data-label="Monto" className={transaction.type === 'expense' ? 'expense-amount' : 'income-amount'}>
                {transaction.type === 'expense' ? `-$${formatAmount(transaction.amount)}` : `$${formatAmount(transaction.amount)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;