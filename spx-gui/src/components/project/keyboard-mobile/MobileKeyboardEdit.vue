<!-- KeyboardEditorModal.vue -->
<template>
    <UIFullScreenModal :visible="true">
        <div class="keyboard-editor">
            <div class="header">
                <h1>{{ t({ en: 'Edit Keyboard', zh: '编辑键盘' }) }}</h1>
            </div>

            <div class="content">
                <div class="phone-container">
                    <div class="phone-1YZxt">
                        <img :src="phone" alt="phone" style="transform: rotate(180deg)" />
                        <div class="stage-vTZqo" :class="{ dragging: !!drag }">
                            <div class="zone zoneA">
                            </div>
                            <div class="zone zoneB">
                            </div>
                            <!-- 拖拽中的浮层（跟随指针） -->
                            <div v-if="drag" class="floating"
                                :style="{ transform: `translate(${drag.x - 25}px, ${drag.y - 25}px)` }">
                                <UIKeyBtn :value="drag.value" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="palette-container">

                    <div class="palette" ref="paletteRef">
                        <div v-for="k in pool" :key="`P-${k}`" class="palette-item"
                            @pointerdown="startDrag('pool', k, $event as PointerEvent)">
                            <UIKeyBtn :value="k" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <UIButton type="primary" @click="confirm">{{ t({ en: 'Confirm', zh: '确定' }) }}</UIButton>
            </div>
        </div>
    </UIFullScreenModal>
</template>

<script setup lang="ts">
import type { ModalComponentEmits, ModalComponentProps } from '@/components/ui/modal/UIModalProvider.vue'
import { UIFullScreenModal, UIButton } from '../../ui'
import { useI18n } from '@/utils/i18n'
type KeyboardLayoutConfig = Record<string, string | null>


const props = defineProps<ModalComponentProps & { initial?: KeyboardLayoutConfig | null }>()
const emit = defineEmits<ModalComponentEmits<KeyboardLayoutConfig>>()

const { t } = useI18n()
import UIKeyBtn from './ui/UIKeyBtn.vue';
import phone from '@/assets/images/mobile.png';
import { reactive, ref } from 'vue'
const pool = ref<string[]>([
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
    'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
    'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
    'Z', 'X', 'C', 'V', 'B', 'N', 'M',
    ' ', '<', 'v', '^', '>'
])
const zones = ['lt', 'rt', 'lbUp', 'lbLeft', 'lbRight', 'lbDown', 'rbA', 'rbB', 'rbX', 'rbY']
type ZoneId = typeof zones[number]
// const zoneToKey = reactive<Record<ZoneId, string | null>>({
//     lt: null, rt: null, lbUp: null, lbLeft: null, lbRight: null, lbDown: null, rbA: null, rbB: null, rbX: null, rbY: null
// })
const zoneToKey = reactive<KeyboardLayoutConfig>(props.initial ?? {})

const zoneRefs = Object.fromEntries(zones.map(id => [id, ref<HTMLElement | null>(null)])) as Record<ZoneId, ReturnType<typeof ref<HTMLElement | null>>>;
const paletteRef = ref<HTMLElement | null>(null)
const drag = ref<{ value: string, x: number, y: number, source: 'pool' | ZoneId } | null>(null)
const hoverZone = ref<ZoneId | null>(null)
function startDrag(source: 'pool' | ZoneId, value: string, e: PointerEvent) {
    // 如果从区域开始拖拽，先清空该区域，等待投放
    if (source !== 'pool') {
        zoneToKey[source] = null
    }
    drag.value = { value, x: e.clientX, y: e.clientY, source }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
}
function onMove(e: PointerEvent) {
    if (!drag.value) return
    drag.value.x = e.clientX
    drag.value.y = e.clientY
    hoverZone.value = null
    for (const id of zones) {
        if (hit(zoneRefs[id]?.value ?? null, e.clientX, e.clientY)) {
            hoverZone.value = id
            break
        }
    }
}
function onUp(e: PointerEvent) {
    window.removeEventListener('pointermove', onMove)
    const d = drag.value
    drag.value = null
    if (!d) { hoverZone.value = null; return }
    // 投放到空区域，若来自池则从池移除
    for (const id of zones) {
        if (hit(zoneRefs[id]?.value ?? null, e.clientX, e.clientY)) {
            if (zoneToKey[id] == null) {
                zoneToKey[id] = d.value
                if (d.source === 'pool') {
                    pool.value = pool.value.filter(v => v !== d.value)
                }
            }
            hoverZone.value = null
            return
        }
    }
    // 未命中任何区域或命中已占用，回到 palette：
    if (d.source !== 'pool') {
        pool.value.push(d.value)
    }
    hoverZone.value = null
}
function hit(el: HTMLElement | null, x: number, y: number) {
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

// function confirm() { emit('resolved', draft.value) }
function confirm() { emit('resolved', zoneToKey) }
</script>
<style lang="scss" scoped>
.keyboard-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 24px;
    box-sizing: border-box;
}

.header {
    text-align: center;
    margin-bottom: 24px;

    h1 {
        font-size: 28px;
        font-weight: 600;
        color: var(--ui-color-title);
        margin: 0;
    }
}

.content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 80px;
    align-items: center;
    overflow: auto;
}

.phone-container {
    flex-shrink: 0;
}

.phone-1YZxt {
    position: relative;
    display: inline-block;

    img {
        display: block;
        width: 800px;
        height: auto;
    }
}

.phone-img {
    display: block;
    max-width: 100%;
    height: auto;
}

.stage-vTZqo {
    // background-color: #413e3e;
    position: absolute;
    inset: 0;
    z-index: 2;

    .zone {
        width: 20%;
        height: 85%;
        position: absolute;
        display: grid;
        place-items: center;
        border: 2px dashed #fff;
        transition: box-shadow .15s, border-color .15s;
    }

    .zoneA {
        left: 5%;
        bottom: 0%;
    }

    .zoneB {
        right: 5%;
        bottom: 0%;
    }

    .floating {
        position: fixed;
        left: 0;
        top: 0;
        pointer-events: none;
        z-index: 5;
    }
}

.palette-container {
    flex-shrink: 0;
    width: 100%;
    max-width: 800px;


}

.palette {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 16px;
    background: var(--ui-color-grey-100);
    border-radius: var(--ui-border-radius-1);
    border: 1px solid var(--ui-color-dividing-line-2);
}

.palette-item {
    cursor: grab;

    &:active {
        cursor: grabbing;
    }
}

.footer {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding-top: 24px;
    border-top: 1px solid var(--ui-color-dividing-line-1);
    margin-top: 24px;
}
</style>