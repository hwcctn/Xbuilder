<template>
  <div>
     <!-- Mobile on-screen controls (only visible on small screens) -->
    <div class="mobile-controls" id="mobileControls" style="display: none">
      <div class="mc-left">
        <div class="mc-btn" data-key="ArrowLeft">◀</div>
        <div class="mc-btn" data-key="ArrowRight">▶</div>
      </div>
      <div class="mc-right">
        <div class="mc-btn" data-key="Space">⭻</div>
        <div class="mc-btn" data-key="ArrowUp">⮝</div>
      </div>
    </div>
  </div>
</template>
    <!-- Mobile controls mapping script  -->
<script>
      (function () {
        function isMobile() {
          return window.matchMedia('(max-width: 768px)').matches
        }
        const controls = document.getElementById('mobileControls')
        if (controls) controls.style.display = isMobile() ? 'flex' : 'none'
        const targetWin = window
        function getCanvas() {
          return (
            document.getElementById('game-canvas') ||
            document.getElementById('editor-canvas') ||
            document.querySelector('canvas')
          )
        }
        function emitKey(type, key) {
          const ev = new KeyboardEvent(type, { key: key, code: key, bubbles: true })
          targetWin.dispatchEvent(ev)
          const canvas = getCanvas()
          if (canvas) canvas.dispatchEvent(ev)
          
        }

        function bind(btn, key) {
          let pressed = false
          const down = (e) => {
            e.preventDefault()
            if (!pressed) {
              pressed = true
              emitKey('keydown', key)
            }
          }
          const up = (e) => {
            e.preventDefault()
            if (pressed) {
              pressed = false
              emitKey('keyup', key)
            }
          }
          ;['touchstart', 'pointerdown', 'mousedown'].forEach((t) => btn.addEventListener(t, down, { passive: false }))
          ;['touchend', 'touchcancel', 'pointerup', 'pointercancel', 'mouseup', 'mouseleave'].forEach((t) =>
            btn.addEventListener(t, up)
          )
        }

        if (controls) {
          controls.querySelectorAll('.mc-btn[data-key]').forEach(function (btn) {
            bind(btn, btn.getAttribute('data-key'))
          })
        }
      })()
</script>

<style lang='scss' scoped>
 /* Mobile on-screen controls */
      @media (max-width: 768px) {
        .mobile-controls {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 12px;
          display: flex;
          justify-content: space-between;
          padding: 0 12px;
          z-index: 9999;
          user-select: none;
          -webkit-user-select: none;
          pointer-events: auto;
        }
        .mc-left,
        .mc-right {
          display: flex;
          gap: 8px;
        }
        .mc-btn {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(6px);
        }
      }
</style>
