import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Modal, 
  TextInput, 
  Alert, 
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useAppContext } from '../store/AppContext';
import { 
  ShoppingBag, Plus, Trash2, CheckCircle2, Circle, 
  ChevronLeft, Package, Calendar, X, AlertTriangle 
} from 'lucide-react-native';
import { ShoppingList, ShoppingItem } from '../types';

const Dashboard: React.FC = () => {
  const { state, addShoppingList, updateShoppingList, deleteShoppingList } = useAppContext();
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

  const activeList = shoppingLists.find(l => l.id === activeListId);

  const triggerDelete = (listId: string) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return;

    const hasUnboughtItems = list.items.length > 0 && list.items.some(i => !i.isBought);
    
    setDeleteConfirm({
      isOpen: true,
      listId: list.id,
      listName: list.name,
      hasPending: hasUnboughtItems
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.listId) {
      deleteShoppingList(deleteConfirm.listId);
      if (activeListId === deleteConfirm.listId) {
        setActiveListId(null);
      }
    }
    setDeleteConfirm({ isOpen: false, listId: null, listName: '', hasPending: false });
  };

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    const newList: ShoppingList = {
      id: Date.now().toString(),
      name: newListName,
      createdAt: new Date().toLocaleDateString('pl-PL'),
      items: []
    };
    addShoppingList(newList);
    setNewListName('');
    setIsCreateModalOpen(false);
    setActiveListId(newList.id);
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
                      <Text style={styles.cardInfoText}>{list.items.length} POZYCJI</Text>
                      {list.items.length > 0 && list.items.every(i => i.isBought) && (
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
        activeList && (
          <ShoppingListDetail 
            list={activeList} 
            darkMode={darkMode} 
            onBack={() => setActiveListId(null)}
            onUpdate={(updated) => updateShoppingList(updated)}
            onDelete={() => triggerDelete(activeList.id)}
          />
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
              <Text style={styles.inputLabel}>NAZWA PROJEKTU</Text>
              <TextInput 
                autoFocus
                placeholder="np. Mieszkanie ul. Polna"
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
                <Text style={styles.pendingWarningText}>Uwaga: Lista zawiera niekupione produkty!</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleConfirmDelete} style={styles.dangerBtn}>
              <Text style={styles.dangerBtnText}>TAK, USUŃ WSZYSTKO</Text>
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

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const newItem: ShoppingItem = {
      id: Math.random().toString(36).substring(7),
      name: newItemName,
      quantity: parseFloat(newItemQty) || 1,
      unit: 'szt',
      isBought: false
    };
    onUpdate({ ...list, items: [...list.items, newItem] });
    setNewItemName('');
    setNewItemQty('1');
  };

  const toggleItem = (itemId: string) => {
    const updatedItems = list.items.map(i => i.id === itemId ? { ...i, isBought: !i.isBought } : i);
    onUpdate({ ...list, items: updatedItems });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={20} color={darkMode ? '#94a3b8' : '#64748b'} />
          <Text style={styles.backBtnText}>POWRÓT</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}><Trash2 size={20} color="#ef4444" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.detailTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>{list.name}</Text>
        
        {/* Formularz dodawania */}
        <View style={[styles.addForm, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
          <TextInput 
            placeholder="Produkt..."
            placeholderTextColor="#94a3b8"
            style={[styles.smallInput, { flex: 3, color: darkMode ? '#fff' : '#000' }]}
            value={newItemName}
            onChangeText={setNewItemName}
          />
          <TextInput 
            keyboardType="numeric"
            style={[styles.smallInput, { flex: 1, textAlign: 'center', color: darkMode ? '#fff' : '#000' }]}
            value={newItemQty}
            onChangeText={setNewItemQty}
          />
          <TouchableOpacity onPress={handleAddItem} style={styles.addItemBtn}><Plus size={20} color="#fff" /></TouchableOpacity>
        </View>

        {/* Lista produktów */}
        <View style={{ gap: 10, marginTop: 20 }}>
          {list.items.length === 0 ? (
            <Text style={styles.emptyItemsText}>Lista jest pusta</Text>
          ) : (
            list.items.map(item => (
              <TouchableOpacity 
                key={item.id} 
                onPress={() => toggleItem(item.id)}
                style={[styles.itemRow, { backgroundColor: item.isBought ? (darkMode ? '#064e3b30' : '#f0fdf4') : (darkMode ? '#0f172a' : '#fff') }]}
              >
                <View style={styles.row}>
                  {item.isBought ? <CheckCircle2 size={22} color="#10b981" /> : <Circle size={22} color={darkMode ? '#334155' : '#cbd5e1'} />}
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.itemName, { color: darkMode ? '#f1f5f9' : '#0f172a', textDecorationLine: item.isBought ? 'line-through' : 'none' }]}>{item.name}</Text>
                    <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => onUpdate({...list, items: list.items.filter(i => i.id !== item.id)})}>
                  <X size={16} color="#ef4444" />
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
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 40 : 10 },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'end', marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  headerSub: { fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 1 },
  addBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 16, elevation: 4 },
  listContainer: { gap: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  listCard: { padding: 20, borderRadius: 24, borderWidth: 2, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardInfoText: { fontSize: 9, fontWeight: '900', color: '#64748b' },
  doneBadge: { backgroundColor: '#10b98120', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  doneBadgeText: { fontSize: 8, color: '#10b981', fontWeight: '900' },
  deleteBtn: { padding: 10, backgroundColor: '#ef444410', borderRadius: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContentWrapper: { width: '100%' },
  modalCard: { borderRadius: 32, padding: 24, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
  inputLabel: { fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 1 },
  input: { height: 56, borderRadius: 16, borderWidth: 2, paddingHorizontal: 16, fontSize: 16, fontWeight: 'bold' },
  modalActionBtn: { backgroundColor: '#2563eb', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#1e40af' },
  modalActionBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  confirmCard: { borderRadius: 32, padding: 24, alignItems: 'center', gap: 12 },
  warningIconBox: { width: 64, height: 64, backgroundColor: '#ef444415', borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '900' },
  confirmSub: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  pendingWarning: { backgroundColor: '#ef444410', padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ef444450' },
  pendingWarningText: { fontSize: 10, color: '#ef4444', fontWeight: '900', textAlign: 'center' },
  dangerBtn: { backgroundColor: '#ef4444', width: '100%', height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dangerBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  cancelBtn: { width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '900', fontSize: 12 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { fontSize: 12, fontWeight: '900', color: '#64748b' },
  detailTitle: { fontSize: 22, fontWeight: '900', marginBottom: 16 },
  addForm: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  smallInput: { height: 44, fontSize: 14, fontWeight: 'bold' },
  addItemBtn: { backgroundColor: '#2563eb', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyItemsText: { textAlign: 'center', fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 40 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 14, fontWeight: '900' },
  itemQty: { fontSize: 10, fontWeight: 'bold', color: '#2563eb' }
});

export default Dashboard;