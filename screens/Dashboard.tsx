// Dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useAppContext } from '../store/AppContext';
import {
  ShoppingBag,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ChevronLeft,
  X,
  AlertTriangle
} from 'lucide-react-native';
import { ShoppingList, ShoppingItem } from '../types';

/* ========================================================= */
/* ======================== DASHBOARD ====================== */
/* ========================================================= */

const Dashboard: React.FC = () => {
  const {
    state,
    addShoppingList,
    updateShoppingList,
    deleteShoppingList,
    setActiveScreen
  } = useAppContext();

  const { shoppingLists, darkMode } = state;

  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    listId: string | null;
    listName: string;
    hasPending: boolean;
  }>({
    isOpen: false,
    listId: null,
    listName: '',
    hasPending: false
  });

  useEffect(() => {
    setActiveScreen('Lista zakupów');
  }, []);

  const activeList = shoppingLists.find(l => l.id === activeListId);

  /* ===================== LISTA ===================== */

 const handleCreateList = async () => {
   if (!newListName.trim()) {
     Alert.alert('Błąd', 'Podaj nazwę listy');
     return;
   }

   try {
     const list: ShoppingList = {
       id: Date.now().toString(),
       name: newListName.trim(),
       createdAt: new Date().toLocaleDateString('pl-PL'),
       items: []
     };

     await addShoppingList(list);

     // Te linie wykonają się TYLKO jeśli addShoppingList zadziała
     setIsCreateModalOpen(false);
     setNewListName('');
     setActiveListId(list.id);
   } catch (error) {
     console.error("Błąd podczas tworzenia listy:", error);
     Alert.alert("Błąd", "Nie udało się zapisać listy. Spróbuj ponownie.");
   }
 };

  const triggerDelete = (listId: string) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return;

    setDeleteConfirm({
      isOpen: true,
      listId,
      listName: list.name,
      hasPending: list.items?.some(i => !i.isBought) ?? false
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.listId) {
      await deleteShoppingList(deleteConfirm.listId);
      setActiveListId(null);
    }
    setDeleteConfirm({ isOpen: false, listId: null, listName: '', hasPending: false });
  };

  /* ===================== RENDER ===================== */

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>
      {!activeListId ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>
              Twoje listy
            </Text>
            <TouchableOpacity onPress={() => setIsCreateModalOpen(true)} style={styles.addBtn}>
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {shoppingLists.length === 0 ? (
            <View style={styles.empty}>
              <ShoppingBag size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>Brak list zakupów</Text>
            </View>
          ) : (
            shoppingLists.map(list => (
              <TouchableOpacity
                key={list.id}
                style={[
                  styles.listCard,
                  {
                    backgroundColor: darkMode ? '#0f172a' : '#fff',
                    borderWidth: 1,
                    borderColor: darkMode ? '#1e293b' : '#e2e8f0'
                  }
                ]}
                onPress={() => setActiveListId(list.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { color: darkMode ? '#f1f5f9' : '#0f172a' }]}>
                    {list.name}
                  </Text>
                  <Text style={[styles.listSub, { color: darkMode ? '#94a3b8' : '#64748b' }]}>
                    {(list.items ?? []).length} pozycji
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    triggerDelete(list.id);
                  }}
                  style={{ padding: 8 }}
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : activeList ? (
        <ShoppingListDetail
          list={activeList}
          darkMode={darkMode}
          onBack={() => setActiveListId(null)}
          onUpdate={updateShoppingList}
          onDelete={() => triggerDelete(activeList.id)}
        />
      ) : (
        <ActivityIndicator size="large" />
      )}

      {/* ================= MODAL NOWEJ LISTY ================= */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <View style={[styles.modalCard, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
              <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>
                Nowa lista zakupów
              </Text>

              <TextInput
                placeholder="Np. Remont kuchni"
                placeholderTextColor="#94a3b8"
                value={newListName}
                onChangeText={setNewListName}
                style={[
                  styles.input,
                  {
                    color: darkMode ? '#fff' : '#0f172a',
                    backgroundColor: darkMode ? '#020617' : '#f8fafc',
                    borderColor: darkMode ? '#1e293b' : '#e2e8f0'
                  }
                ]}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateList}>
                <Text style={styles.primaryBtnText}>UTWÓRZ</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <Text style={styles.cancelText}>Anuluj</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ================= MODAL USUWANIA ================= */}
      <Modal visible={deleteConfirm.isOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <AlertTriangle size={32} color="#ef4444" />
            <Text style={styles.confirmTitle}>Usunąć listę?</Text>
            <Text style={styles.confirmSub}>{deleteConfirm.listName}</Text>

            {deleteConfirm.hasPending && (
              <Text style={styles.warningText}>
                Lista zawiera niezrealizowane pozycje
              </Text>
            )}

            <TouchableOpacity style={styles.dangerBtn} onPress={confirmDelete}>
              <Text style={styles.dangerText}>USUŃ</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}>
              <Text style={styles.cancelText}>Anuluj</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ========================================================= */
/* =================== SZCZEGÓŁ LISTY ====================== */
/* ========================================================= */

const ShoppingListDetail: React.FC<{
  list: ShoppingList;
  darkMode: boolean;
  onBack: () => void;
  onUpdate: (l: ShoppingList) => void;
  onDelete: () => void;
}> = ({ list, darkMode, onBack, onUpdate, onDelete }) => {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('szt');

  const items = list.items ?? [];

  const addItem = () => {
    if (!name.trim()) return;

    const item: ShoppingItem = {
      id: Date.now().toString(),
      name: name.trim(),
      quantity: Number(qty.replace(',', '.')) || 1,
      unit,
      isBought: false
    };

    onUpdate({ ...list, items: [...items, item] });
    setName('');
    setQty('1');
    setUnit('szt');
  };

  const toggle = (id: string) =>
    onUpdate({
      ...list,
      items: items.map(i => (i.id === id ? { ...i, isBought: !i.isBought } : i))
    });

  const remove = (id: string) =>
    onUpdate({ ...list, items: items.filter(i => i.id !== id) });

  return (
    <View style={{ flex: 1 }}>
      <View style={[
        styles.detailHeader,
        { borderBottomColor: darkMode ? '#1e293b' : '#e2e8f0' }
      ]}>
        <TouchableOpacity 
          onPress={onBack}
          style={{ padding: 8 }}
        >
          <ChevronLeft size={24} color={darkMode ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
        <Text style={[
          styles.detailTitle, 
          { 
            color: darkMode ? '#f1f5f9' : '#0f172a',
            marginBottom: 0,
            fontSize: 20
          }
        ]}>
          {list.name}
        </Text>
        <TouchableOpacity 
          onPress={onDelete}
          style={{ padding: 8 }}
        >
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        style={{ backgroundColor: darkMode ? '#020617' : '#f8fafc' }}
      >
        <View style={[styles.addRow, { backgroundColor: darkMode ? '#0f172a' : '#f8fafc', padding: 12, borderRadius: 16 }]}>
          <TextInput 
            placeholder="Produkt" 
            placeholderTextColor={darkMode ? '#64748b' : '#94a3b8'}
            value={name} 
            onChangeText={setName} 
            style={[
              styles.smallInput, 
              { 
                backgroundColor: darkMode ? '#020617' : '#fff',
                borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                color: darkMode ? '#f1f5f9' : '#0f172a'
              }
            ]} 
          />
          <TextInput 
            placeholder="Ilość" 
            placeholderTextColor={darkMode ? '#64748b' : '#94a3b8'}
            value={qty} 
            onChangeText={setQty} 
            style={[
              styles.smallInput, 
              { 
                flex: 0.5,
                backgroundColor: darkMode ? '#020617' : '#fff',
                borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                color: darkMode ? '#f1f5f9' : '#0f172a'
              }
            ]} 
            keyboardType="numeric" 
          />
          <TextInput 
            placeholder="JM" 
            placeholderTextColor={darkMode ? '#64748b' : '#94a3b8'}
            value={unit} 
            onChangeText={setUnit} 
            style={[
              styles.smallInput, 
              { 
                flex: 0.5,
                backgroundColor: darkMode ? '#020617' : '#fff',
                borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                color: darkMode ? '#f1f5f9' : '#0f172a'
              }
            ]} 
          />
          <TouchableOpacity 
            onPress={addItem}
            style={{
              backgroundColor: '#2563eb',
              padding: 12,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: darkMode ? '#64748b' : '#94a3b8', fontSize: 14 }}>
              Brak pozycji na liście
            </Text>
          </View>
        ) : (
          items.map(item => (
            <View 
              key={item.id} 
              style={[
                styles.itemRow,
                {
                  backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
                  borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                  opacity: item.isBought ? 0.6 : 1
                }
              ]}
            >
              <TouchableOpacity onPress={() => toggle(item.id)} style={{ marginRight: 12 }}>
                {item.isBought ? (
                  <CheckCircle2 size={22} color="#10b981" />
                ) : (
                  <Circle size={22} color={darkMode ? '#475569' : '#cbd5e1'} />
                )}
              </TouchableOpacity>
              <Text 
                style={{ 
                  flex: 1, 
                  fontSize: 15,
                  color: darkMode ? '#f1f5f9' : '#0f172a',
                  textDecorationLine: item.isBought ? 'line-through' : 'none'
                }}
              >
                {item.name} – {item.quantity} {item.unit}
              </Text>
              <TouchableOpacity 
                onPress={() => remove(item.id)}
                style={{ padding: 4 }}
              >
                <X size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

/* ========================================================= */
/* ========================== STYLE ======================== */
/* ========================================================= */

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '900' },
  addBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 16 },
  listCard: { 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 18, 
    flexDirection: 'row', 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  listTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  listSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 100, paddingVertical: 40 },
  emptyText: { marginTop: 10, fontWeight: '900', color: '#94a3b8', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
  modalCard: { borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
  input: { borderWidth: 2, borderRadius: 14, padding: 14, marginBottom: 16 },
  primaryBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '900', textAlign: 'center' },
  cancelText: { textAlign: 'center', marginTop: 12, color: '#64748b' },

  confirmCard: { backgroundColor: '#fff', padding: 24, borderRadius: 24, alignItems: 'center' },
  confirmTitle: { fontSize: 18, fontWeight: '900', marginTop: 12 },
  confirmSub: { color: '#64748b', marginBottom: 8 },
  warningText: { color: '#ef4444', fontWeight: '900', marginBottom: 12 },
  dangerBtn: { backgroundColor: '#ef4444', padding: 14, borderRadius: 14, width: '100%' },
  dangerText: { color: '#fff', fontWeight: '900', textAlign: 'center' },

  detailHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  detailTitle: { fontSize: 24, fontWeight: '900', marginBottom: 16, color: '#0f172a' },
  addRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 16,
    alignItems: 'center'
  },
  smallInput: { 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    borderRadius: 12, 
    padding: 12, 
    flex: 1,
    backgroundColor: '#fff',
    fontSize: 14
  },
  itemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  }
});

export default Dashboard;
