import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, Alert, Animated, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useAppContext } from '../store/AppContext';
import {
  Plus, Trash2, Edit2, Search, ChevronDown, ChevronRight,
  X, Save, FolderPlus, Tag, Check, Package
} from 'lucide-react-native';
import { Service, UnitOfMeasure, MaterialItem, MaterialMode, Category } from '../types';
import { getThemeColors, getShadows, BorderRadius } from '../utils/theme';
import { useToast } from '../components/Toast';

const ServicesList: React.FC = () => {
  const { state, addService, updateService, setActiveScreen, deleteService, addCategory, deleteCategory } = useAppContext();
  const { darkMode, categories, services } = state;
  const colors = getThemeColors(darkMode);
  const shadows = getShadows(darkMode);
  const { showToast } = useToast();
  const styles = getStyles(colors);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newCatName, setNewCatName] = useState('');

  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  // Animacje
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (isModalOpen || isCatModalOpen) {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalOpacity.setValue(0);
      modalScale.setValue(0.9);
    }
  }, [isModalOpen, isCatModalOpen]);

  const [formData, setFormData] = useState({
    name: '', description: '', netPrice: '', vatRate: '8',
    unit: 'm2' as UnitOfMeasure, categoryId: 'cat_general',
    materialMode: 'estimated' as MaterialMode, estimatedMaterialPrice: '',
    materials: [] as MaterialItem[]
  });

  const [tempMaterial, setTempMaterial] = useState({
    name: '', price: '', consumption: ''
  });

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      showToast("Wpisz nazwę kategorii", "error");
      return;
    }
    const newCat: Category = { id: Date.now().toString(), name: newCatName.trim() };
    await addCategory(newCat);
    setNewCatName('');
    setIsCatModalOpen(false);
    showToast("Dodano kategorię", "success");
  };

  useEffect(() => {
    setActiveScreen('Usługi');
  }, []);

  const handleSubmit = async () => {
    if (!formData.name || !formData.netPrice) {
      showToast("Podaj nazwę i cenę usługi", "error");
      return;
    }

    const serviceData: Service = {
      id: editingService?.id || Date.now().toString(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      netPrice: parseFloat(formData.netPrice) || 0,
      vatRate: parseInt(formData.vatRate) || 8,
      unit: formData.unit,
      categoryId: formData.categoryId || 'cat_general',
      materialMode: formData.materialMode,
      estimatedMaterialPrice: formData.materialMode === 'estimated' ? (parseFloat(formData.estimatedMaterialPrice) || 0) : 0,
      defaultMaterials: formData.materialMode === 'detailed' ? formData.materials : []
    };

    try {
      if (editingService) {
        await updateService(serviceData);
        showToast("Zaktualizowano usługę", "success");
      } else {
        await addService(serviceData);
        showToast("Dodano nową usługę", "success");
      }
      resetForm();
    } catch (error) {
      console.error('Błąd zapisywania usługi:', error);
      showToast("Błąd zapisu", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', netPrice: '', vatRate: '8',
      unit: 'm2', categoryId: 'cat_general',
      materialMode: 'estimated', estimatedMaterialPrice: '', materials: []
    });
    setEditingService(null);
    setIsModalOpen(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      netPrice: service.netPrice.toString(),
      vatRate: service.vatRate.toString(),
      unit: service.unit,
      categoryId: service.categoryId || 'cat_general',
      materialMode: service.materialMode || 'estimated',
      estimatedMaterialPrice: service.estimatedMaterialPrice?.toString() || '',
      materials: service.defaultMaterials || []
    });
    setIsModalOpen(true);
  };

  const filteredServices = services.filter(s =>
    s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      <View style={styles.topBar}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Szukaj usługi..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <TouchableOpacity
          onPress={() => setIsCatModalOpen(true)}
          style={[styles.catBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
        >
          <FolderPlus size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* RENDEROWANIE KATEGORII Z BAZY */}
        {categories.map(cat => {
          const catServices = filteredServices.filter(s => s.categoryId === cat.id);
          const isCollapsed = collapsedCats[cat.id] || false;

          return (
            <View key={cat.id} style={[styles.catSection, shadows.sm]}>
              <TouchableOpacity
                onPress={() => setCollapsedCats(prev => ({ ...prev, [cat.id]: !isCollapsed }))}
                style={[
                  styles.catHeader,
                  {
                    backgroundColor: colors.surface,
                    borderBottomWidth: isCollapsed ? 0 : 1,
                    borderBottomColor: colors.border,
                  }
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Tag size={18} color={colors.accent} />
                  <Text style={[styles.catTitle, { color: colors.text }]}>{cat.name}</Text>
                  <View style={[styles.badge, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{catServices.length}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {cat.id !== 'cat_general' && (
                    <TouchableOpacity onPress={() => {
                      Alert.alert("Usuń kategorię", `Czy usunąć "${cat.name}"? Usługi zostaną przeniesione do kategorii Ogólna.`, [
                        { text: "Anuluj", style: "cancel" },
                        {
                          text: "Usuń", style: "destructive", onPress: () => {
                            deleteCategory(cat.id);
                            showToast("Kategoria usunięta", "info");
                          }
                        }
                      ]);
                    }}>
                      <Trash2 size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                  {isCollapsed ? <ChevronRight size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
                </View>
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={[styles.serviceList, { backgroundColor: colors.surfaceSubtle }]}>
                  {catServices.map((service, index) => (
                    <ServiceRow
                      key={service.id}
                      service={service}
                      colors={colors}
                      styles={styles}
                      isLast={index === catServices.length - 1}
                      onEdit={() => handleEdit(service)}
                      onDelete={() => {
                        deleteService(service.id);
                        showToast("Usługa usunięta", "info");
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* FALLBACK: Usługi które nie pasują do żadnej kategorii w state */}
        {(() => {
          const orphaned = filteredServices.filter(s => !categories.find(c => c.id === s.categoryId));
          if (orphaned.length === 0) return null;
          return (
            <View style={styles.catSection}>
              <View style={[styles.catHeader, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Tag size={18} color={colors.danger} />
                  <Text style={[styles.catTitle, { color: colors.danger }]}>NIEPRZYPISANE</Text>
                  <View style={[styles.badge, { backgroundColor: colors.dangerBg }]}>
                    <Text style={[styles.badgeText, { color: colors.danger }]}>{orphaned.length}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.serviceList}>
                {orphaned.map((s, index) => (
                  <ServiceRow
                    key={s.id}
                    service={s}
                    colors={colors}
                    styles={styles}
                    isLast={index === orphaned.length - 1}
                    onEdit={() => handleEdit(s)}
                    onDelete={() => {
                      deleteService(s.id);
                      showToast("Usługa usunięta", "info");
                    }}
                  />
                ))}
              </View>
            </View>
          );
        })()}
      </ScrollView>

      <TouchableOpacity
        onPress={() => setIsModalOpen(true)}
        style={[styles.fab, { backgroundColor: colors.accent, ...shadows.lg }]}
        activeOpacity={0.8}
      >
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      {/* MODAL KATEGORII */}
      <Modal visible={isCatModalOpen} transparent animationType="fade" onRequestClose={() => setIsCatModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.catModalContent,
              {
                backgroundColor: colors.surface,
                opacity: modalOpacity,
                transform: [{ scale: modalScale }]
              }
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 15 }]}>Nowa kategoria</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
              placeholder="Wpisz nazwę..."
              placeholderTextColor={colors.textMuted}
              value={newCatName}
              onChangeText={setNewCatName}
            />
            <View style={[styles.row, { marginTop: 20 }]}>
              <TouchableOpacity onPress={() => setIsCatModalOpen(false)} style={[styles.saveBtn, { flex: 1, backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.saveBtnText, { color: colors.textSecondary }]}>ANULUJ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCategory} style={[styles.saveBtn, { flex: 1, backgroundColor: colors.accent }]}>
                <Text style={[styles.saveBtnText, { color: '#fff' }]}>DODAJ</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL USŁUGI */}
      <Modal visible={isModalOpen} animationType="slide" onRequestClose={resetForm}>
        <SafeAreaView style={[styles.modalBody, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingService ? 'Edycja' : 'Nowa usługa'}</Text>
            <TouchableOpacity onPress={resetForm}><X size={28} color={colors.text} /></TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>KATEGORIA</Text>
            <View style={[styles.pickerBox, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <Picker
                selectedValue={formData.categoryId}
                onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} color={colors.text} />)}
              </Picker>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>NAZWA USŁUGI</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
              value={formData.name}
              onChangeText={(v) => setFormData({ ...formData, name: v })}
            />

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CENA NETTO</Text>
                <TextInput
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
                  value={formData.netPrice}
                  onChangeText={(v) => setFormData({ ...formData, netPrice: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>J.M.</Text>
                <View style={[styles.pickerBox, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                  <Picker
                    selectedValue={formData.unit}
                    onValueChange={(v) => setFormData({ ...formData, unit: v as UnitOfMeasure })}
                    style={{ color: colors.text }}
                    dropdownIconColor={colors.text}
                  >
                    <Picker.Item label="m2" value="m2" />
                    <Picker.Item label="mb" value="mb" />
                    <Picker.Item label="szt" value="szt" />
                    <Picker.Item label="m3" value="m3" />
                    <Picker.Item label="opak" value="opak" />
                  </Picker>
                </View>
              </View>
            </View>

            {/* SEKCJA MATERIAŁÓW */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>MATERIAŁY</Text>
            <View style={[styles.modeToggle, { gap: 10 }]}>
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, materialMode: 'estimated' })}
                style={[
                  styles.modeBtn,
                  formData.materialMode === 'estimated'
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border }
                ]}
              >
                <Package size={16} color={formData.materialMode === 'estimated' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.modeBtnText, { color: formData.materialMode === 'estimated' ? '#fff' : colors.textSecondary }]}>RYCZAŁT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, materialMode: 'detailed' })}
                style={[
                  styles.modeBtn,
                  formData.materialMode === 'detailed'
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border }
                ]}
              >
                <Package size={16} color={formData.materialMode === 'detailed' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.modeBtnText, { color: formData.materialMode === 'detailed' ? '#fff' : colors.textSecondary }]}>LISTA MAT.</Text>
              </TouchableOpacity>
            </View>

            {formData.materialMode === 'estimated' ? (
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CENA MATERIAŁU NA J.M.</Text>
                <TextInput
                  placeholder="np. 25 zł / m2"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
                  value={formData.estimatedMaterialPrice}
                  onChangeText={(v) => setFormData({ ...formData, estimatedMaterialPrice: v })}
                />
              </View>
            ) : (
              <View style={[styles.materialBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.materialHint, { color: colors.textMuted }]}>
                  Dodaj domyślne materiały dla tej usługi. Będą automatycznie dołączane do wyceny.
                </Text>
                {formData.materials.map((m, idx) => (
                  <View key={m.id || idx} style={[styles.materialRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.materialName, { color: colors.text }]}>{m.name}</Text>
                      <Text style={[styles.materialInfo, { color: colors.textMuted }]}>{m.price} zł × {m.consumption || 1} {m.unit}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setFormData({
                      ...formData,
                      materials: formData.materials.filter((_, i) => i !== idx)
                    })}>
                      <Trash2 size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.addMaterialForm}>
                  <TextInput
                    placeholder="Nazwa materiału"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderWidth: 1, marginBottom: 8 }]}
                    value={tempMaterial.name}
                    onChangeText={(v) => setTempMaterial({ ...tempMaterial, name: v })}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      placeholder="Cena"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
                      value={tempMaterial.price}
                      onChangeText={(v) => setTempMaterial({ ...tempMaterial, price: v })}
                    />
                    <TextInput
                      placeholder="Zużycie/jm"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
                      value={tempMaterial.consumption}
                      onChangeText={(v) => setTempMaterial({ ...tempMaterial, consumption: v })}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (!tempMaterial.name || !tempMaterial.price) {
                        showToast("Podaj nazwę i cenę", "error");
                        return;
                      }
                      const newMat: MaterialItem = {
                        id: `mat_${Date.now()}`,
                        name: tempMaterial.name,
                        price: parseFloat(tempMaterial.price) || 0,
                        unit: 'szt',
                        quantity: 1,
                        consumption: parseFloat(tempMaterial.consumption) || 1
                      };
                      setFormData({ ...formData, materials: [...formData.materials, newMat] });
                      setTempMaterial({ name: '', price: '', consumption: '' });
                      showToast("Dodano materiał", "success");
                    }}
                    style={[styles.addMaterialBtn, { backgroundColor: colors.accent }]}
                  >
                    <Plus size={16} color="#fff" />
                    <Text style={styles.addMaterialBtnText}>DODAJ MATERIAŁ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity onPress={handleSubmit} style={[styles.saveBtn, { backgroundColor: colors.accent, marginTop: 30 }]}>
              <Save size={20} color="#fff" />
              <Text style={[styles.saveBtnText, { color: '#fff' }]}>ZAPISZ USŁUGĘ</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const ServiceRow = ({ service, colors, styles, isLast, onEdit, onDelete }: any) => {
  return (
    <View
      style={[
        styles.serviceRow,
        {
          backgroundColor: colors.surface,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.borderSubtle || colors.border
        }
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
          <Text style={[styles.servicePrice, { color: colors.accent }]}>
            {service.netPrice} zł <Text style={{ color: colors.textMuted, fontSize: 12 }}>/ {service.unit}</Text>
          </Text>
          {service.materialMode === 'estimated' && (
            <View style={[styles.tag, { backgroundColor: colors.surfaceSubtle }]}>
              <Package size={10} color={colors.textMuted} />
              <Text style={[styles.tagText, { color: colors.textMuted }]}>Ryczałt</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={onEdit}>
          <Edit2 size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}>
          <Trash2 size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Style
const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', padding: 16, gap: 10 },
  searchWrapper: { flex: 1, height: 50, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontWeight: 'bold' },
  catBtn: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  catSection: {
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    zIndex: 2,
  },
  catTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  serviceList: {},
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
  },
  serviceName: { fontSize: 14, fontWeight: '600' },
  servicePrice: { fontSize: 14, fontWeight: '800' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 30, // Pozycja dostosowana do braku navbara w niektórych widokach
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  catModalContent: { width: '100%', borderRadius: 25, padding: 25, elevation: 10 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 8, marginTop: 15, letterSpacing: 0.5 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 15, fontWeight: '600' },
  pickerBox: { borderRadius: 12, height: 50, justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  saveBtnText: { fontWeight: '900', fontSize: 15 },
  modeToggle: { flexDirection: 'row', marginBottom: 15 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  modeBtnText: { fontWeight: '800', fontSize: 11 },
  materialBox: { padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  materialHint: { fontSize: 12, marginBottom: 12, lineHeight: 18 },
  materialRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  materialName: { fontSize: 14, fontWeight: '700' },
  materialInfo: { fontSize: 12, marginTop: 2 },
  addMaterialForm: { marginTop: 12 },
  addMaterialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, marginTop: 12 },
  addMaterialBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 }
});

export default ServicesList;