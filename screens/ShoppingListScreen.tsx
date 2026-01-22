import React, { useState, useEffect, useMemo } from 'react';
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
import { getThemeColors, getShadows, BorderRadius } from '../utils/theme';
import {
  ShoppingBag,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ChevronLeft,
  X,
  AlertTriangle,
  Check,
  ListChecks
} from 'lucide-react-native';
import { ShoppingList, ShoppingItem } from '../types';

/* ========================================================= */
/* =================== SHOPPING LIST SCREEN ================ */
/* ========================================================= */

const ShoppingListScreen: React.FC = () => {
  const {
    state,
    addShoppingList,
    updateShoppingList,
    deleteShoppingList,
    setActiveScreen
  } = useAppContext();

  const { shoppingLists, darkMode } = state;
  const colors = getThemeColors(darkMode);
  const shadows = getShadows(darkMode);
  const styles = getStyles(colors);

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

  /* ===================== LOGIC ===================== */

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
     setIsCreateModalOpen(false);
     setNewListName('');
     setActiveListId(list.id);
   } catch (error) {
     console.error("Błąd podczas tworzenia listy:", error);
     Alert.alert("Błąd", "Nie udało się zapisać listy.");
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!activeListId ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Twoje listy
            </Text>
            <TouchableOpacity 
              onPress={() => setIsCreateModalOpen(true)} 
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {shoppingLists.length === 0 ? (
            <View style={styles.empty}>
              <ShoppingBag size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Brak list zakupów</Text>
            </View>
          ) : (
            shoppingLists.map(list => {
              const isComplete = list.items?.length > 0 && list.items?.every(i => i.isBought);
              
              return (
                <TouchableOpacity
                  key={list.id}
                  style={[
                    styles.listCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isComplete ? colors.success : colors.border,
                      borderLeftWidth: isComplete ? 6 : 1,
                      borderLeftColor: isComplete ? colors.success : colors.border,
                      ...shadows.sm
                    }
                  ]}
                  onPress={() => setActiveListId(list.id)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.listTitle, { color: colors.text }]}>
                        {list.name}
                      </Text>
                      {isComplete && <CheckCircle2 size={16} color={colors.success} />}
                    </View>
                    <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                      {(list.items ?? []).length} pozycji • {list.createdAt}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      triggerDelete(list.id);
                    }}
                    style={{ padding: 8 }}
                  >
                    <Trash2 size={18} color={colors.danger} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : activeList ? (
        <ShoppingListDetail
          list={activeList}
          colors={colors}
          styles={styles}
          onBack={() => setActiveListId(null)}
          onUpdate={updateShoppingList}
          onDelete={() => triggerDelete(activeList.id)}
        />
      ) : (
        <ActivityIndicator size="large" color={colors.accent} />
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
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Nowa lista zakupów
              </Text>

              <TextInput
                placeholder="Np. Remont kuchni"
                placeholderTextColor={colors.textMuted}
                value={newListName}
                onChangeText={setNewListName}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border
                  }
                ]}
              />

              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: colors.accent }]} 
                onPress={handleCreateList}
              >
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
          <View style={[styles.confirmCard, { backgroundColor: colors.surface }]}>
            <AlertTriangle size={32} color={colors.danger} />
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Usunąć listę?</Text>
            <Text style={[styles.confirmSub, { color: colors.textSecondary }]}>{deleteConfirm.listName}</Text>

            {deleteConfirm.hasPending && (
              <Text style={[styles.warningText, { color: colors.danger }]}>
                Lista zawiera niezrealizowane pozycje
              </Text>
            )}

            <TouchableOpacity 
              style={[styles.dangerBtn, { backgroundColor: colors.danger }]} 
              onPress={confirmDelete}
            >
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
  colors: any;
  styles: any;
  onBack: () => void;
  onUpdate: (l: ShoppingList) => void;
  onDelete: () => void;
}> = ({ list, colors, styles, onBack, onUpdate, onDelete }) => {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('szt');

  const items = list.items ?? [];
  const isAllBought = items.length > 0 && items.every(i => i.isBought);

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
        { borderBottomColor: colors.border, backgroundColor: colors.surface }
      ]}>
        <TouchableOpacity 
          onPress={onBack}
          style={{ padding: 8 }}
        >
          <ChevronLeft size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[
          styles.detailTitle, 
          { color: colors.text }
        ]}>
          {list.name}
        </Text>
        <TouchableOpacity 
          onPress={onDelete}
          style={{ padding: 8 }}
        >
          <Trash2 size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        style={{ backgroundColor: colors.background }}
      >
        {isAllBought && (
          <View style={[styles.successBanner, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
            <CheckCircle2 size={24} color={colors.success} />
            <Text style={[styles.successText, { color: colors.success }]}>Wszystkie produkty kupione!</Text>
          </View>
        )}

        <View style={[styles.addRow, { backgroundColor: colors.surface, padding: 16, borderRadius: 20, borderColor: colors.border, borderWidth: 1 }]}>
          <TextInput 
            placeholder="Produkt" 
            placeholderTextColor={colors.textMuted}
            value={name} 
            onChangeText={setName} 
            style={[
              styles.smallInput, 
              { 
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
              }
            ]} 
          />
          <TextInput 
            placeholder="Il." 
            placeholderTextColor={colors.textMuted}
            value={qty} 
            onChangeText={setQty} 
            style={[
              styles.smallInput, 
              { 
                flex: 0.4,
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
              }
            ]} 
            keyboardType="numeric" 
          />
          <TextInput 
            placeholder="JM" 
            placeholderTextColor={colors.textMuted}
            value={unit} 
            onChangeText={setUnit} 
            style={[
              styles.smallInput, 
              { 
                flex: 0.4,
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
              }
            ]} 
          />
          <TouchableOpacity 
            onPress={addItem}
            style={{
              backgroundColor: colors.accent,
              width: 44,
              height: 44,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ListChecks size={48} color={colors.borderStrong} />
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 16 }}>
              Dodaj pierwsze produkty do listy
            </Text>
          </View>
        ) : (
          items.map(item => (
            <View 
              key={item.id} 
              style={[
                styles.itemRow,
                {
                  backgroundColor: item.isBought ? colors.surfaceSubtle : colors.surface,
                  borderColor: colors.border,
                  opacity: item.isBought ? 0.7 : 1
                }
              ]}
            >
              <TouchableOpacity onPress={() => toggle(item.id)} style={{ marginRight: 12 }}>
                {item.isBought ? (
                  <CheckCircle2 size={24} color={colors.success} />
                ) : (
                  <Circle size={24} color={colors.borderStrong} />
                )}
              </TouchableOpacity>
              <Text 
                style={{ 
                  flex: 1, 
                  fontSize: 16,
                  fontWeight: '500',
                  color: item.isBought ? colors.textMuted : colors.text,
                  textDecorationLine: item.isBought ? 'line-through' : 'none'
                }}
              >
                {item.name}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginRight: 12 }}>
                 {item.quantity} {item.unit}
              </Text>
              <TouchableOpacity 
                onPress={() => remove(item.id)}
                style={{ padding: 4 }}
              >
                <X size={20} color={colors.danger} />
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

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  addBtn: { padding: 12, borderRadius: 14 },
  listCard: { 
    padding: 20, 
    borderRadius: 20, 
    flexDirection: 'row', 
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center'
  },
  listTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  listSub: { fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 100, paddingVertical: 40 },
  emptyText: { marginTop: 16, fontWeight: '600', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', padding: 24, justifyContent: 'center' },
  modalCard: { borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20, fontSize: 16 },
  primaryBtn: { padding: 16, borderRadius: 16, marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: 16 },
  cancelText: { textAlign: 'center', marginTop: 8, color: '#64748b', fontWeight: '600' },

  confirmCard: { padding: 24, borderRadius: 24, alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '800', marginTop: 16 },
  confirmSub: { marginBottom: 20, marginTop: 4 },
  warningText: { fontWeight: '700', marginBottom: 20 },
  dangerBtn: { padding: 16, borderRadius: 16, width: '100%', marginBottom: 12 },
  dangerText: { color: '#fff', fontWeight: '800', textAlign: 'center' },

  detailHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    paddingTop: 60 // For status bar
  },
  detailTitle: { fontSize: 20, fontWeight: '800' },
  addRow: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: 20,
    alignItems: 'center'
  },
  smallInput: { 
    borderWidth: 1, 
    borderRadius: 14, 
    padding: 12, 
    flex: 1,
    fontSize: 14,
    height: 44
  },
  itemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
  },
  successText: {
    fontWeight: '700',
    fontSize: 16,
  }
});

export default ShoppingListScreen;