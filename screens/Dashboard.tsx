import React, { useState,useEffect } from 'react';
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
  ShoppingBag, Plus, Trash2, CheckCircle2, Circle, 
  ChevronLeft, Package, X, AlertTriangle
} from 'lucide-react-native';
import { ShoppingList, ShoppingItem } from '../types';

const Dashboard: React.FC = () => {
  const { state, addShoppingList, updateShoppingList, deleteShoppingList, setActiveScreen } = useAppContext();
  const { shoppingLists, darkMode } = state;


  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [activeListId, setActiveListId] = useState<string | null>(null);

  // Stan dla własnego modala potwierdzenia usunięcia
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
   setActiveScreen('Lista zakupów'); // lub odpowiednia nazwa
 }, []);
  const activeList = shoppingLists.find(l => l.id === activeListId);

  const triggerDelete = (listId: string) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return;

    // Sprawdzenie czy są niekupione przedmioty
    const hasUnboughtItems = list.items && list.items.length > 0 && list.items.some(i => !i.isBought);

    setDeleteConfirm({
      isOpen: true,
      listId: list.id,
      listName: list.name,
      hasPending: hasUnboughtItems
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm.listId) {
      await deleteShoppingList(deleteConfirm.listId);
      if (activeListId === deleteConfirm.listId) {
        setActiveListId(null);
      }
    }
    setDeleteConfirm({ isOpen: false, listId: null, listName: '', hasPending: false });
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert("Błąd", "Podaj nazwę listy.");
      return;
    }

    const newListId = Date.now().toString();
    const newList: ShoppingList = {
      id: newListId,
      name: newListName.trim(),
      createdAt: new Date().toLocaleDateString('pl-PL'),
      items: []
    };

    try {
      setIsCreateModalOpen(false);
      setNewListName('');

      // Dodajemy do bazy i stanu
      await addShoppingList(newList);

      // Ustawiamy jako aktywne - Dashboard przeskoczy do widoku detali
      setActiveListId(newListId);
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się utworzyć listy.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>
      {!activeListId ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>Twoje Listy</Text>
              <Text style={styles.headerSub}>ZARZĄDZANIE MATERIAŁAMI</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsCreateModalOpen(true)}
              style={styles.addBtn}
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {shoppingLists.length === 0 ? (
              <View style={styles.emptyState}>
                <ShoppingBag size={48} color={darkMode ? '#1e293b' : '#cbd5e1'} />
                <Text style={styles.emptyText}>Brak list zakupów</Text>
              </View>
            ) : (
              shoppingLists.map(list => (
                <TouchableOpacity
                  key={list.id}
                  onPress={() => setActiveListId(list.id)}
                  style={[styles.listCard, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>{list.name}</Text>
                    <View style={styles.cardInfo}>
                      <Package size={10} color="#3b82f6" />
                      <Text style={styles.cardInfoText}>{(list.items || []).length} POZYCJI</Text>
                      {list.items && list.items.length > 0 && list.items.every(i => i.isBought) && (
                        <View style={styles.doneBadge}><Text style={styles.doneBadgeText}>GOTOWE</Text></View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => triggerDelete(list.id)} style={styles.deleteBtn}>
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        // Renderujemy detal tylko jeśli lista istnieje w stanie, inaczej pokazujemy loader
        activeList ? (
          <ShoppingListDetail
            list={activeList}
            darkMode={darkMode}
            onBack={() => setActiveListId(null)}
            onUpdate={(updated) => updateShoppingList(updated)}
            onDelete={() => triggerDelete(activeList.id)}
          />
        ) : (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Synchronizacja listy...</Text>
          </View>
        )
      )}

      {/* MODAL KREACJI LISTY */}
      <Modal visible={isCreateModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContentWrapper}>
            <View style={[styles.modalCard, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>Nowa Lista</Text>
                <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}><X size={20} color={darkMode ? '#94a3b8' : '#64748b'} /></TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>NAZWA PROJEKTU (KATEGORIA: OGÓLNA)</Text>
              <TextInput
                autoFocus
                placeholder="np. Remont salonu"
                placeholderTextColor="#94a3b8"
                style={[styles.input, { backgroundColor: darkMode ? '#020617' : '#f8fafc', color: darkMode ? '#fff' : '#000', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}
                value={newListName}
                onChangeText={setNewListName}
              />
              <TouchableOpacity onPress={handleCreateList} style={styles.modalActionBtn}>
                <Text style={styles.modalActionBtnText}>UTWÓRZ LISTĘ</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL POTWIERDZENIA USUNIĘCIA */}
      <Modal visible={deleteConfirm.isOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
            <View style={styles.warningIconBox}><AlertTriangle size={32} color="#ef4444" /></View>
            <Text style={[styles.confirmTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>Usunąć listę?</Text>
            <Text style={styles.confirmSub}>Czy na pewno chcesz usunąć: {deleteConfirm.listName}?</Text>

            {deleteConfirm.hasPending && (
              <View style={styles.pendingWarning}>
                <Text style={styles.pendingWarningText}>UWAGA: Lista posiada niezakupione pozycje!</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleConfirmDelete} style={styles.dangerBtn}>
              <Text style={styles.dangerBtnText}>TAK, USUŃ LISTĘ</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>ANULUJ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const ShoppingListDetail: React.FC<{
  list: ShoppingList,
  darkMode: boolean,
  onBack: () => void,
  onUpdate: (l: ShoppingList) => void,
  onDelete: () => void
}> = ({ list, darkMode, onBack, onUpdate, onDelete }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');

  const items = Array.isArray(list.items) ? list.items : [];

  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    const newItem: ShoppingItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      name: newItemName.trim(),
      quantity: parseFloat(newItemQty.replace(',', '.')) || 1,
      unit: 'szt',
      isBought: false
    };

    onUpdate({ ...list, items: [...items, newItem] });
    setNewItemName('');
    setNewItemQty('1');
  };

  const toggleItem = (itemId: string) => {
    const updatedItems = items.map(i =>
      i.id === itemId ? { ...i, isBought: !i.isBought } : i
    );
    onUpdate({ ...list, items: updatedItems });
  };

  const removeItem = (itemId: string) => {
    onUpdate({ ...list, items: items.filter(i => i.id !== itemId) });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={20} color={darkMode ? '#94a3b8' : '#64748b'} />
          <Text style={styles.backBtnText}>POWRÓT</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.deleteTopBtn}>
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.detailTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>{list.name}</Text>

        {/* Formularz dodawania */}
        <View style={[styles.addForm, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
          <TextInput
            placeholder="Nazwa produktu..."
            placeholderTextColor="#94a3b8"
            style={[styles.smallInput, { flex: 3, color: darkMode ? '#fff' : '#000' }]}
            value={newItemName}
            onChangeText={setNewItemName}
          />
          <TextInput
            keyboardType="numeric"
            placeholder="Ilość"
            placeholderTextColor="#94a3b8"
            style={[styles.smallInput, { flex: 1, textAlign: 'center', color: darkMode ? '#fff' : '#000' }]}
            value={newItemQty}
            onChangeText={setNewItemQty}
          />
          <TouchableOpacity onPress={handleAddItem} style={styles.addItemBtn}>
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Lista produktów */}
        <View style={{ gap: 10, marginTop: 20 }}>
          {items.length === 0 ? (
            <View style={styles.emptyItemsBox}>
              <Text style={styles.emptyItemsText}>Lista zakupów jest pusta.</Text>
              <Text style={styles.emptyItemsSub}>Dodaj materiały powyżej.</Text>
            </View>
          ) : (
            items.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggleItem(item.id)}
                style={[
                  styles.itemRow,
                  {
                    backgroundColor: item.isBought ? (darkMode ? '#064e3b20' : '#f0fdf4') : (darkMode ? '#0f172a' : '#fff'),
                    borderColor: item.isBought ? '#10b98140' : (darkMode ? '#1e293b' : '#e2e8f0')
                  }
                ]}
              >
                <View style={styles.row}>
                  {item.isBought ?
                    <CheckCircle2 size={24} color="#10b981" /> :
                    <Circle size={24} color={darkMode ? '#334155' : '#cbd5e1'} />
                  }
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[
                      styles.itemName,
                      {
                        color: darkMode ? '#f1f5f9' : '#0f172a',
                        textDecorationLine: item.isBought ? 'line-through' : 'none',
                        opacity: item.isBought ? 0.6 : 1
                      }
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.itemRemoveBtn}>
                  <X size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '900' },
  headerSub: { fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 1.5, marginTop: 2 },
  addBtn: { backgroundColor: '#2563eb', width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  listContainer: { gap: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 15 },
  emptyText: { fontSize: 13, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listCard: { padding: 20, borderRadius: 24, borderWidth: 2, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardInfoText: { fontSize: 10, fontWeight: '900', color: '#64748b' },
  doneBadge: { backgroundColor: '#10b98120', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  doneBadgeText: { fontSize: 9, color: '#10b981', fontWeight: '900' },
  deleteBtn: { padding: 12, backgroundColor: '#ef444410', borderRadius: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContentWrapper: { width: '100%' },
  modalCard: { borderRadius: 32, padding: 24, gap: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 1 },
  input: { height: 60, borderRadius: 18, borderWidth: 2, paddingHorizontal: 18, fontSize: 16, fontWeight: '700' },
  modalActionBtn: { backgroundColor: '#2563eb', height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#1e40af' },
  modalActionBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  confirmCard: { borderRadius: 32, padding: 24, alignItems: 'center', gap: 16 },
  warningIconBox: { width: 70, height: 70, backgroundColor: '#ef444415', borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  confirmTitle: { fontSize: 22, fontWeight: '900' },
  confirmSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  pendingWarning: { backgroundColor: '#ef444410', padding: 16, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ef4444' },
  pendingWarningText: { fontSize: 11, color: '#ef4444', fontWeight: '900', textAlign: 'center' },
  dangerBtn: { backgroundColor: '#ef4444', width: '100%', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dangerBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  cancelBtn: { width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '900', fontSize: 13 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#64748b10', paddingRight: 12, paddingVertical: 6, borderRadius: 10 },
  backBtnText: { fontSize: 11, fontWeight: '900', color: '#64748b' },
  deleteTopBtn: { padding: 8 },
  detailTitle: { fontSize: 26, fontWeight: '900', marginBottom: 20, paddingHorizontal: 4 },
  addForm: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 20, borderWidth: 2 },
  smallInput: { height: 50, fontSize: 15, fontWeight: '700' },
  addItemBtn: { backgroundColor: '#2563eb', width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyItemsBox: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
  emptyItemsText: { fontSize: 14, color: '#94a3b8', fontWeight: '800' },
  emptyItemsSub: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemName: { fontSize: 15, fontWeight: '800' },
  itemQty: { fontSize: 11, fontWeight: '900', color: '#2563eb', marginTop: 2 },
  itemRemoveBtn: { padding: 6 }
});

export default Dashboard;