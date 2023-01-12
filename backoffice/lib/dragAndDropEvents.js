window.updateDraggableEvents= function () {
    document.querySelectorAll(".dropCase").forEach(function(el) {
        el.addEventListener("dragenter", ondragenter)
        el.addEventListener("dragleave", ondragleave)
        el.addEventListener("dragstart", ondragstart)
        el.addEventListener("dragend", ondragend);
    })


    function ondragenter() {
        console.log('ondragenter');
        angular.element(this).scope().switchElement(this, 'in')
    }

    function ondragleave() {
        console.log('ondragleave')
        angular.element(this).scope().switchElement(this, 'out')
    }

    function ondragstart() {
        console.log('ondragstart')
        angular.element(this).scope().draggingStart(this)
    }

    function ondragend() {
        console.log('ondragend')
        angular.element(this).scope().draggingEnd(this)
    }
}