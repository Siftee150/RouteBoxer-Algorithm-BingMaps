var RouteBoxer={
  R         :  6371, // earth's mean radius in km
  grid_     : null,
  latGrid_  : [],
  lngGrid_  : [],
  boxesX_   : [],
  boxesY_   : [],
 
  box: function (path,range) {
   // var vertices = null;
    this.grid_ = null;
    // Array that holds the latitude coordinate of each vertical grid line
    this.latGrid_ = [];
    // Array that holds the longitude coordinate of each horizontal grid line
    this.lngGrid_ = [];
    // Array of bounds that cover the whole route formed by merging cells that
    //  the route intersects first horizontally, and then vertically
    this.boxesX_ = [];
    // Array of bounds that cover the whole route formed by merging cells that
    //  the route intersects first vertically, and then horizontally
    this.boxesY_ = [];
    // The array of LatLngs representing the vertices of the path
     var vertices = path;
  //return routeBounds.getBounds();
  this.buildGrid_(vertices, range);
  
  this.findIntersectingCells_(vertices);
  // Merge adjacent intersected grid cells (and their neighbours) into two sets
    //  of bounds, both of which cover them completely
    this.mergeIntersectingCells_();
    // Return the set of merged bounds that has the fewest elements
  //  console.log(this.boxesX_);
    //console.log(this.boxesY_)

    return (this.boxesX_.length <= this.boxesY_.length ?
            this.boxesX_ :
            this.boxesY_);
    
  },

buildGrid_ : function(vertices, range) {
    //console.log(routeBoundsCenter.lat);
var routeBounds = Microsoft.Maps.LocationRect.fromLocations(vertices);
var routeBoundsCenter = routeBounds.center;
    // Starting from the center define grid lines outwards vertically until they
    //  extend beyond the edge of the bounding box by more than one cell
    this.latGrid_.push(routeBoundsCenter.latitude);
    // Add lines from the center out to the north
    this.latGrid_.push(rhumbDestinationPoint(0, range,routeBoundsCenter).latitude);
    for (i = 2; this.latGrid_[i - 2] < routeBounds.getNorthwest().latitude; i++) {
      this.latGrid_.push(rhumbDestinationPoint(0, range * i,routeBoundsCenter).latitude);
    }
    // Add lines from the center out to the south
    for (i = 1; this.latGrid_[1] > routeBounds.getSoutheast().latitude; i++) {
      this.latGrid_.unshift(rhumbDestinationPoint(180, range * i,routeBoundsCenter).latitude);
    }
    // Starting from the center define grid lines outwards horizontally until they
    //  extend beyond the edge of the bounding box by more than one cell
    this.lngGrid_.push(routeBoundsCenter.longitude);
    // Add lines from the center out to the east
    this.lngGrid_.push(rhumbDestinationPoint(90, range,routeBoundsCenter).longitude);
    for (i = 2; this.lngGrid_[i - 2] < routeBounds.getSoutheast().longitude; i++) {
      this.lngGrid_.push(rhumbDestinationPoint(90, range * i,routeBoundsCenter).longitude);
    }
    // Add lines from the center out to the west
    for (i = 1; this.lngGrid_[1] > routeBounds.getNorthwest().longitude; i++) {
      this.lngGrid_.unshift(rhumbDestinationPoint(270, range * i,routeBoundsCenter).longitude);
    }
    // Create a two dimensional array representing this grid
    this.grid_ = new Array(this.lngGrid_.length);
    for (i = 0; i < this.grid_.length; i++) {
      this.grid_[i] = new Array(this.latGrid_.length);
    }
 },

findIntersectingCells_ : function (vertices) {
    // Find the cell where the path begins
    var hintXY = this.getCellCoords_(vertices[0]);
    // Mark that cell and it's neighbours for inclusion in the boxes
    this.markCell_(hintXY);
    // Work through each vertex on the path identifying which grid cell it is in
    for (var i = 1; i < vertices.length; i++) {
      // Use the known cell of the previous vertex to help find the cell of this vertex
      var gridXY = this.getGridCoordsFromHint_(vertices[i], vertices[i - 1], hintXY);
      if (gridXY[0] === hintXY[0] && gridXY[1] === hintXY[1]) {
        // This vertex is in the same cell as the previous vertex
        // The cell will already have been marked for inclusion in the boxes
        continue;
      } else if ((Math.abs(hintXY[0] - gridXY[0]) === 1 && hintXY[1] === gridXY[1]) ||
          (hintXY[0] === gridXY[0] && Math.abs(hintXY[1] - gridXY[1]) === 1)) {
        // This vertex is in a cell that shares an edge with the previous cell
        // Mark this cell and it's neighbours for inclusion in the boxes
        this.markCell_(gridXY);
      } else {
        // This vertex is in a cell that does not share an edge with the previous
        //  cell. This means that the path passes through other cells between
        //  this vertex and the previous vertex, and we must determine which cells
        //  it passes through
        this.getGridIntersects_(vertices[i - 1], vertices[i], hintXY, gridXY);
      }
      // Use this cell to find and compare with the next one
      hintXY = gridXY;
    }
  },
   
   getCellCoords_ : function (latlng) {
    for (var x = 0; this.lngGrid_[x] < latlng.longitude; x++) {}
    for (var y = 0; this.latGrid_[y] < latlng.latitude; y++) {}
    return ([x - 1, y - 1]);
  },

  markCell_ : function (cell) {
    var x = cell[0];
    var y = cell[1];

    this.grid_[x - 1][y - 1] = 1;
    this.grid_[x][y - 1] = 1;
    this.grid_[x + 1][y - 1] = 1;
    this.grid_[x - 1][y] = 1;
    this.grid_[x][y] = 1;
    this.grid_[x + 1][y] = 1;
    this.grid_[x - 1][y + 1] = 1;
    this.grid_[x][y + 1] = 1;
    this.grid_[x + 1][y + 1] = 1;
  },


   getGridCoordsFromHint_ : function (latlng, hintlatlng, hint) {
    var x, y;
    if (latlng.longitude > hintlatlng.longitude) {
      for (x = hint[0]; this.lngGrid_[x + 1] < latlng.longitude; x++) {}
    } else {
      for (x = hint[0]; this.lngGrid_[x] > latlng.longitude; x--) {}
    }
    if (latlng.latitude > hintlatlng.latitude) {
      for (y = hint[1]; this.latGrid_[y + 1] < latlng.latitude; y++) {}
    } else {
      for (y = hint[1]; this.latGrid_[y] > latlng.latitude; y--) {}
    }
    return ([x, y]);
  },

   getGridIntersect_ : function (start, brng, gridLineLat) {
    var d = this.R * ((gridLineLat.toRad() - start.latitude.toRad()) / Math.cos(brng.toRad()));
    return rhumbDestinationPoint(brng,d,start);
  },

  
  getGridIntersects_ : function (start, end, startXY, endXY) {
    var edgePoint, edgeXY, i;
    var brng = rhumbBearingTo(end,start);
             // Step 1.

    var hint = start;
    var hintXY = startXY;

    // Handle a line segment that travels south first
    if (end.latitude > start.latitude) {
      // Iterate over the east to west grid lines between the start and end cells
      for (i = startXY[1] + 1; i <= endXY[1]; i++) {
        // Find the latlng of the point where the path segment intersects with
        //  this grid line (Step 2 & 3)
        edgePoint = this.getGridIntersect_(start, brng, this.latGrid_[i]);
        // Find the cell containing this intersect point (Step 4)
        edgeXY = this.getGridCoordsFromHint_(edgePoint, hint, hintXY);
        // Mark every cell the path has crossed between this grid and the start,
        //   or the previous east to west grid line it crossed (Step 5)
        this.fillInGridSquares_(hintXY[0], edgeXY[0], i - 1);
        // Use the point where it crossed this grid line as the reference for the
        //  next iteration
        hint = edgePoint;
        hintXY = edgeXY;
      }
      // Mark every cell the path has crossed between the last east to west grid
      //  line it crossed and the end (Step 5)
      this.fillInGridSquares_(hintXY[0], endXY[0], i - 1);
    } else {
      // Iterate over the east to west grid lines between the start and end cells
      for (i = startXY[1]; i > endXY[1]; i--) {
        // Find the latlng of the point where the path segment intersects with
        //  this grid line (Step 2 & 3)
        edgePoint = this.getGridIntersect_(start, brng, this.latGrid_[i]);
        // Find the cell containing this intersect point (Step 4)
        edgeXY = this.getGridCoordsFromHint_(edgePoint, hint, hintXY);
        // Mark every cell the path has crossed between this grid and the start,
        //   or the previous east to west grid line it crossed (Step 5)
        this.fillInGridSquares_(hintXY[0], edgeXY[0], i);
        // Use the point where it crossed this grid line as the reference for the
        //  next iteration
        hint = edgePoint;
        hintXY = edgeXY;
      }
      // Mark every cell the path has crossed between the last east to west grid
      //  line it crossed and the end (Step 5)
      this.fillInGridSquares_(hintXY[0], endXY[0], i);
    }
  },

   fillInGridSquares_ : function (startx, endx, y) {
    var x;
    if (startx < endx) {
      for (x = startx; x <= endx; x++) {
        this.markCell_([x, y]);
      }
    } else {
      for (x = startx; x >= endx; x--) {
        this.markCell_([x, y]);
      }
    }
  },
   
    mergeIntersectingCells_ : function () {
    var x, y, box;
    // The box we are currently expanding with new cells
    var currentBox = null;
    // Traverse the grid a row at a time
    for (y = 0; y < this.grid_[0].length; y++) {
      for (x = 0; x < this.grid_.length; x++) {
        if (this.grid_[x][y]) {
          // This cell is marked for inclusion. If the previous cell in this
          //   row was also marked for inclusion, merge this cell into it's box.
          // Otherwise start a new box.
          box = this.getCellBounds_([x, y]);
          if (currentBox) {
            //console()
            currentBox=Microsoft.Maps.LocationRect.fromLocations(currentBox.getNorthwest(),currentBox.getSoutheast(),new Microsoft.Maps.Location(box.getNorth(),box.getEast()));
          } else {
            currentBox = box; 
          }
        } else {
          // This cell is not marked for inclusion. If the previous cell was
          //  marked for inclusion, merge it's box with a box that spans the same
          //  columns from the row below if possible.
          this.mergeBoxesY_(currentBox);
          currentBox = null;
        }
      }
      // If the last cell was marked for inclusion, merge it's box with a matching
      //  box from the row below if possible.
      this.mergeBoxesY_(currentBox);
      currentBox = null;
    }
    // Traverse the grid a column at a time
    for (x = 0; x < this.grid_.length; x++) {
      for (y = 0; y < this.grid_[0].length; y++) {
        if (this.grid_[x][y]) {
          // This cell is marked for inclusion. If the previous cell in this
          //   column was also marked for inclusion, merge this cell into it's box.
          // Otherwise start a new box.
          if (currentBox) {
            box = this.getCellBounds_([x, y]);
            currentBox=Microsoft.Maps.LocationRect.fromLocations(currentBox.getNorthwest(),currentBox.getSoutheast(),
            new Microsoft.Maps.Location(box.getNorth(),box.getEast()));
             } else {
            currentBox = this.getCellBounds_([x, y]);
          }
        } else {
          // This cell is not marked for inclusion. If the previous cell was
          //  marked for inclusion, merge it's box with a box that spans the same
          //  rows from the column to the left if possible.
          this.mergeBoxesX_(currentBox);
          currentBox = null;
        }
      }
      // If the last cell was marked for inclusion, merge it's box with a matching
      //  box from the column to the left if possible.
      this.mergeBoxesX_(currentBox);
      currentBox = null;
    }
  },

   getCellBounds_ : function (cell) {
    return new Microsoft.Maps.LocationRect.fromLocations(
      new Microsoft.Maps.Location(this.latGrid_[cell[1]], this.lngGrid_[cell[0]]),
      new Microsoft.Maps.Location(this.latGrid_[cell[1] + 1], this.lngGrid_[cell[0] + 1]));
  },

   mergeBoxesX_ : function (box) {
    if (box !== null) {
      for (var i = 0; i < this.boxesX_.length; i++) {
        if (this.boxesX_[i].getSoutheast().longitude === box.getNorthwest().longitude &&
            this.boxesX_[i].getSoutheast().latitude === box.getSoutheast().latitude &&
            this.boxesX_[i].getNorthwest().latitude === box.getNorthwest().latitude) {
          this.boxesX_[i]=Microsoft.Maps.LocationRect.fromLocations(this.boxesX_[i].getNorthwest(),
            this.boxesX_[i].getSoutheast(), new Microsoft.Maps.Location(box.getNorth(),box.getEast())
           );
          return;
        }
      }
      this.boxesX_.push(box);
    }
  },

  /**
   * Search for an existing box in an adjacent column to the given box that spans
   * the same set of rows and if one is found merge the given box into it. If one
   * is not found, append this box to the list of existing boxes.
   *
   * @param {LatLngBounds}  The box to merge
   */
  mergeBoxesY_ : function (box) {
    if (box !== null) {
      for (var i = 0; i < this.boxesY_.length; i++) {
        if (this.boxesY_[i].getNorthwest().latitude === box.getSoutheast().latitude &&
            this.boxesY_[i].getNorthwest().longitude === box.getNorthwest().longitude &&
            this.boxesY_[i].getSoutheast().longitude === box.getSoutheast().longitude) {
          this.boxesY_[i]=Microsoft.Maps.LocationRect.fromLocations(this.boxesY_[i].getNorthwest(),
            this.boxesY_[i].getSoutheast(),
             new Microsoft.Maps.Location(box.getNorth(),box.getEast())
            );
          return;
        }
      }
      this.boxesY_.push(box);
    }
  }


};

rhumbDestinationPoint = function (brng, dist,loct) {
  var R = 6371; // earth's mean radius in km
  var d = parseFloat(dist) / R;  // d = angular distance covered on earth's surface
  var lat1 = loct.latitude.toRad(), lon1 = loct.longitude.toRad();
  brng = brng.toRad();

  var lat2 = lat1 + d * Math.cos(brng);
  var dLat = lat2 - lat1;
  var dPhi = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));
  var q = (Math.abs(dLat) > 1e-10) ? dLat / dPhi : Math.cos(lat1);
  var dLon = d * Math.sin(brng) / q;
  // check for going past the pole
  if (Math.abs(lat2) > Math.PI / 2) {
    lat2 = lat2 > 0 ? Math.PI - lat2 : - (Math.PI - lat2);
  }
  var lon2 = (lon1 + dLon + Math.PI) % (2 * Math.PI) - Math.PI;

  if (isNaN(lat2) || isNaN(lon2)) {
    return null;
  }
  return new Microsoft.Maps.Location(lat2.toDeg(), lon2.toDeg());
};

rhumbBearingTo = function (dest,loct) {
  var dLon = (dest.longitude - loct.longitude).toRad();
  var dPhi = Math.log(Math.tan(dest.latitude.toRad() / 2 + Math.PI / 4) / Math.tan(loct.latitude.toRad() / 2 + Math.PI / 4));
  if (Math.abs(dLon) > Math.PI) {
    dLon = dLon > 0 ? -(2 * Math.PI - dLon) : (2 * Math.PI + dLon);
  }
  return Math.atan2(dLon, dPhi).toBrng();
};

Number.prototype.toRad = function () {
  return this * Math.PI / 180;
};

/**
 * Extend the Number object to convert radians to degrees
 *
 * @return {Number} Bearing in degrees
 * @ignore
 */
Number.prototype.toDeg = function () {
  return this * 180 / Math.PI;
};

/**
 * Normalize a heading in degrees to between 0 and +360
 *
 * @return {Number} Return
 * @ignore
 */
Number.prototype.toBrng = function () {
  return (this.toDeg() + 360) % 360;
};

