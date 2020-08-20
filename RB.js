var RouteBoxer=
{
  R         :  6371, // earth's mean radius in km
  grid_     : null,
  latGrid_  : [],
  lngGrid_  : [],
  boxesX_   : [],
  boxesY_   : [],
 
  box: function (path) {
   // var vertices = null;
     var vertices = path;
  var routeBounds = Microsoft.Maps.LocationRect.fromLocations(vertices);
  var routeBoundsCenter = routeBounds.center;
  return routeBoundsCenter;
  
  }
};