<template>
  <UIFullScreenModal :visible="true">
    <div class="keyboard-editor">
      <div class="header">
        <h1>{{ t({ en: 'Edit Keyboard', zh: '编辑键盘' }) }}</h1>
      </div>

      <div class="content">
        <div class="editor-row">
          <div class="key-pool-side">
            <div class="pool-header">{{ t({ en: 'Recognized Keys', zh: '识别的按键' }) }}</div>
            <div ref="paletteAutoRef" class="palette">
              <div v-for="k in autoPool" :key="`P-${k}`" class="palette-item"
                @pointerdown="startDragPool('autoPool', k, $event as PointerEvent)">
                <UIKeyBtn :value="k" />
              </div>
            </div>
          </div>
          <div class="phone-container">
            <div class="phone-1YZxt">
              <img :src="phone" alt="phone" style="transform: rotate(180deg)" />
              <div class="stage" :class="{ dragging: !!drag }">
                <!-- 系统键 2 个 -->
                <!-- <div class="zone sysA">
                  <UIButton v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project in full screen' }"
                    icon="rotate">
                    {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
                  </UIButton>
                </div>
                <div class="zone sysB">
                  <UIButton v-radar="{ name: 'Close full screen', desc: 'Click to close full screen project runner' }"
                    icon="close">
                    {{ $t({ en: 'Close', zh: '关闭' }) }}
                  </UIButton>
                </div> -->
                <div v-for="z in zones" :key="z" class="zone" :class="z"
                  :ref="(el) => (zoneRefs[z].value = el as HTMLElement)">
                  <div v-for="(k, i) in zoneTokeys[z]" :key="k.keyValue + '-' + i" class="key"
                    :class="{ dragging: drag?.kind === 'key' && drag.zone === z && drag.index === i }"
                    :style="{ left: k.x + '%', top: k.y + '%', touchAction: 'none' }"
                    @pointerdown.stop="startDragKey(z, i, $event)">
                    <UIKeyBtn :value="k.keyValue" :active="false" />
                  </div>
                </div>

                <!-- 拖拽中的浮层（跟随指针） -->
                <div v-if="drag" class="floating"
                  :style="{ transform: `translate(${drag.x - 25}px, ${drag.y - 25}px)` }">
                  <UIKeyBtn :value="drag.keyValue" :active="false" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="palette-container">
          <n-space vertical>
            <n-switch v-model:value="show">
              <template #checked>
                {{ t({ en: 'AllKeys-expand', zh: '全部按键-展开' }) }}
              </template>
              <template #unchecked>
                {{ t({ en: 'AllKeys-fold', zh: '全部按键-折叠' }) }}
              </template>
            </n-switch>
            <n-collapse-transition :show="show">
              <div class="pool-header"></div>
              <div ref="paletteAllRef" class="palette">
                <div v-for="k in allPool" :key="`P-${k}`" class="palette-item"
                  @pointerdown="startDragPool('allPool', k, $event as PointerEvent)">
                  <UIKeyBtn :value="k" />
                </div>
              </div>
            </n-collapse-transition>
          </n-space>
        </div>
      </div>

      <div class="footer">
        <UIButton type="primary" @click="confirm">{{ t({ en: 'Confirm', zh: '确定' }) }}</UIButton>
      </div>
    </div>
  </UIFullScreenModal>
</template>

<script setup lang="ts">
import type { MobileKeyboardZoneToKeyMapping } from '@/apis/project'
import type { ModalComponentEmits, ModalComponentProps } from '@/components/ui/modal/UIModalProvider.vue'
import { UIFullScreenModal, UIButton } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { onUnmounted } from 'vue'
import { NSpace, NSwitch, NCollapseTransition } from 'naive-ui'
import type { KeyCode } from './mobile-keyboard'
defineOptions({ name: 'MobileKeyboardEdit' })
const props = defineProps<
  ModalComponentProps & {
    zoneToKeyMapping: MobileKeyboardZoneToKeyMapping | null
    projectKeys: KeyCode[] | null
  }
>()
const emit = defineEmits<ModalComponentEmits<MobileKeyboardZoneToKeyMapping>>()
const show = ref(false)
const { t } = useI18n()
import UIKeyBtn from './UIKeyBtn.vue'
import phone from './mobile.png'
import { reactive, ref } from 'vue'
import { webKeys } from '@/utils/spx'


const assignedKeys = new Set(Object.values(props.zoneToKeyMapping ?? {}).filter((v): v is string => v != null))

const allPool = ref<string[]>(webKeys.filter((k) => !props.projectKeys?.includes(k) && !assignedKeys.has(k)))
const autoPool = ref<string[]>(props.projectKeys ? props.projectKeys.filter((k) => !assignedKeys.has(k)) : [])
const zones = ['lt', 'rt', 'lb', 'rb'] as const
type ZoneId = (typeof zones)[number]
type KeyPos = { keyValue: string, x: number, y: number }
const zoneTokeys = reactive<Record<ZoneId, KeyPos[]>>({
  lt: [], rt: [], lb: [], rb: []
})


const zoneToKey = reactive<MobileKeyboardZoneToKeyMapping>(props.zoneToKeyMapping ?? {})

const zoneOriginPool = reactive<Record<ZoneId, 'autoPool' | 'allPool' | undefined>>({ lt: undefined, rt: undefined, lb: undefined, rb: undefined })

for (const id of zones) {
  const k = zoneToKey[id]
  if (k) {
    zoneOriginPool[id] = props.projectKeys?.includes(k) ? 'autoPool' : 'allPool'
  }
}

const zoneRefs = Object.fromEntries(zones.map((id) => [id, ref<HTMLElement | null>(null)])) as Record<
  ZoneId,
  ReturnType<typeof ref<HTMLElement | null>>
>
const paletteAutoRef = ref<HTMLElement | null>(null)
const paletteAllRef = ref<HTMLElement | null>(null)
type DragState =
  | { kind: 'pool'; from: 'autoPool' | 'allPool'; keyValue: string; x: number; y: number }
  | {
    kind: 'key'
    zone: ZoneId
    index: number
    keyValue: string
    x: number
    y: number
    prevX: number
    prevY: number
  }
const drag = ref<DragState | null>(null)
const hoverZone = ref<ZoneId | null>(null)

function startDragPool(from: 'autoPool' | 'allPool', keyValue: string, e: PointerEvent) {
  drag.value = { kind: 'pool', from, keyValue, x: e.clientX, y: e.clientY }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}

function startDragKey(zone: ZoneId, index: number, e: PointerEvent) {
  const k = zoneTokeys[zone][index]
  if (!k) return
  drag.value = {
    kind: 'key',
    zone,
    index,
    keyValue: k.keyValue,
    x: e.clientX,
    y: e.clientY,
    prevX: k.x,
    prevY: k.y
  }
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
  if (drag.value.kind === 'key') {
    // 跟随指针在原区内移动（仅更新位置，不跨区转移）
    const [px, py] = getPercentInZone(drag.value.zone, e.clientX, e.clientY)
    const kp = zoneTokeys[drag.value.zone][drag.value.index]
    if (kp) {
      kp.x = px
      kp.y = py
    }
  }
}
function onUp(e: PointerEvent) {
  window.removeEventListener('pointermove', onMove)
  const d = drag.value
  drag.value = null
  if (!d) {
    hoverZone.value = null
    return
  }
  const targetZone = zones.find((id) => hit(zoneRefs[id]?.value ?? null, e.clientX, e.clientY)) ?? null

  if (d.kind === 'pool') {
    if (targetZone) {
      const [px, py] = getPercentInZone(targetZone, e.clientX, e.clientY)
      zoneTokeys[targetZone].push({ keyValue: d.keyValue, x: px, y: py })
      if (d.from === 'autoPool') autoPool.value = autoPool.value.filter((v) => v !== d.keyValue)
      else allPool.value = allPool.value.filter((v) => v !== d.keyValue)
    }
    hoverZone.value = null
    return
  }

  // d.kind === 'key'
  const fromZone = d.zone
  if (targetZone && targetZone !== fromZone) {
    const [px, py] = getPercentInZone(targetZone, e.clientX, e.clientY)
    const item = zoneTokeys[fromZone].splice(d.index, 1)[0]
    if (item) zoneTokeys[targetZone].push({ keyValue: item.keyValue, x: px, y: py })
  } else if (targetZone === fromZone) {
    const [px, py] = getPercentInZone(fromZone, e.clientX, e.clientY)
    const kp = zoneTokeys[fromZone][d.index]
    if (kp) { kp.x = px; kp.y = py }
  } else {
    // 未命中任何区域，若命中池则回池；否则回原位置
    const overAuto = hit(paletteAutoRef.value, e.clientX, e.clientY)
    const overAll = hit(paletteAllRef.value, e.clientX, e.clientY)
    if (overAuto || overAll) {
      const item = zoneTokeys[fromZone].splice(d.index, 1)[0]
      if (item) {
        if (overAuto) {
          if (!autoPool.value.includes(item.keyValue)) autoPool.value.push(item.keyValue)
        } else if (overAll) {
          if (!allPool.value.includes(item.keyValue)) allPool.value.push(item.keyValue)
        }
      }
    } else {
      const kp = zoneTokeys[fromZone][d.index]
      if (kp && d.kind === 'key') { kp.x = d.prevX; kp.y = d.prevY }
    }
  }
  hoverZone.value = null
}
function hit(el: HTMLElement | null, x: number, y: number) {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

function getPercentInZone(zone: ZoneId, clientX: number, clientY: number): [number, number] {
  const el = zoneRefs[zone]?.value
  if (!el) return [50, 50]
  const r = el.getBoundingClientRect()
  const px = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))
  const py = Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100))
  return [px, py]
}

function confirm() {
  emit('resolved', zoneToKey)
}
onUnmounted(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
})
</script>

<style scoped lang="scss">
.keyboard-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
}

.header {
  text-align: center;
  margin-bottom: 10px;

  h1 {
    font-size: 25px;
    font-weight: 600;
    color: var(--ui-color-title);
    margin: 0;
  }
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  overflow: auto;
  justify-content: center;

  .editor-row {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: center;
    gap: 50px;
  }
}

.phone-container {
  flex-shrink: 0;
}

.phone-1YZxt {
  position: relative;
  display: inline-block;

  img {
    display: block;
    width: 750px;
    height: auto;
  }
}

.phone-img {
  display: block;
  max-width: 100%;
  height: auto;
}

.stage {
  position: absolute;
  inset: 0;
  z-index: 2;

  .zone {
    position: absolute;
    width: 30%;
    height: 49%;
    border: 2px dashed #fff;
    transition:
      box-shadow 0.15s,
      border-color 0.15s;
  }

  .zone.lt {
    left: 0;
    top: 0;
  }

  .zone.rt {
    right: 0;
    top: 0;
  }

  .zone.lb {
    left: 0;
    bottom: 0;
  }

  .zone.rb {
    right: 0;
    bottom: 0;
  }

  .key {
    position: absolute;
    transform: translate(-50%, -50%);

    &.dragging {
      opacity: 0;
      pointer-events: none;
    }
  }

  .sysA {
    left: 5%;
    top: 5%;
  }

  .sysB {
    right: 5%;
    top: 5%;
  }

  &.dragging .zone {
    border-color: var(--color-primary);
  }

  .zone.over {
    box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.3) inset;
  }

  .floating {
    position: fixed;
    left: 0;
    top: 0;
    pointer-events: none;
    z-index: 5;
  }
}

.key-pool-side {
  flex-shrink: 0;
  width: 100%;
  max-width: 350px;
  display: flex;
  flex-direction: column;
}

.key-pool-side .palette {
  flex: 1;
  /* fill column height */
  overflow: auto;
  /* scroll if taller than phone */
}

.palette-container {
  flex-shrink: 0;
  width: 100%;
  max-width: 1200px;
}

.pool-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-color-title);
  margin-bottom: 8px;
}

.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
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
