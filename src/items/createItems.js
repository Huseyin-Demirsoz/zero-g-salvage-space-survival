import * as THREE from 'three';
import { ITEM_TYPES } from '../utils/constants.js';
import { GLTFLoader } from '/lib/three/addons/loaders/GLTFLoader.js';

function makeStripedBox(width, height, depth, color, stripeColor) {
	const group = new THREE.Group();
	const base = new THREE.Mesh(
		new THREE.BoxGeometry(width, height, depth),
		new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.04 })
	);
	group.add(base);
	
	const stripe = new THREE.Mesh(
		new THREE.BoxGeometry(width * 1.04, height * 0.22, depth * 1.04),
		new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.48 })
	);
	group.add(stripe);
	return group;
}
function loadMesh(path){
	const group = new THREE.Group();
	const gltfLoader = new GLTFLoader();
	gltfLoader.load(path, ( gltf ) => {
		group.add(gltf.scene);
	});
	return group;/
}
export function createItemMesh(type, definition) {
	const scale = definition.scale ?? 1;
	const material = new THREE.MeshStandardMaterial({
		color: definition.color,
		emissive: definition.emissive,
		emissiveIntensity: 0.25,
		roughness: 0.55,
		metalness: type === ITEM_TYPES.OXYGEN || type === ITEM_TYPES.EXTINGUISHER ? 0.35 : 0.05
	});
	
	let mesh;
	
	switch (type) {
		case ITEM_TYPES.FOOD:
			mesh = makeStripedBox(0.9 * scale, 0.55 * scale, 0.25 * scale, definition.color, 0xeef3a1);
			break;
		case ITEM_TYPES.WATER:
			mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.22 * scale, 0.95 * scale, 18), material);
			break;
		case ITEM_TYPES.OXYGEN:
			mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * scale, 0.32 * scale, 1.35 * scale, 20), material);
			break;
		case ITEM_TYPES.EXTINGUISHER:
			mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * scale, 0.75 * scale, 8, 16), material);
			break;
		case ITEM_TYPES.CRATE:
			mesh = makeStripedBox(1.2 * scale, 1.2 * scale, 1.2 * scale, definition.color, 0xf6c66f);
			break;
		default:
			//mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65 * scale, 0), material);
			mesh = loadMesh("/test.glb");
			break;
	}
	
	mesh.traverse((child) => {
		if (!child.isMesh) return;
		child.castShadow = true;
		child.receiveShadow = true;
		if (child.material?.emissive) {
			child.material.emissive.setHex(definition.emissive);
			child.material.emissiveIntensity = 0.25;
		}
	});
	
	mesh.userData.originalEmissive = definition.emissive;
	mesh.userData.originalEmissiveIntensity = 0.25;
	mesh.userData.definition = definition;
	
	return mesh;
}
