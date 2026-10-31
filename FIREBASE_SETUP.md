# GoldenTicket — Firebase

## 1. Instalar dependencias
Desde la carpeta del proyecto ejecutar:

```bash
npm install
```

La dependencia `firebase` ya está declarada en `package.json`.

## 2. Firebase configurado
`src/firebase/config.js` conecta esta aplicación con el proyecto Firebase `goldenticket-61b02` usando la configuración web de la aplicación.

En Firebase Console, Authentication debe tener habilitado **Correo electrónico/contraseña** y Firestore Database debe estar creada.

## 3. Publicar reglas de Firestore
En Firebase Console > Firestore Database > Reglas, copiar el contenido del archivo `firestore.rules` y pulsar **Publicar**. Las reglas permiten que el público lea el catálogo y que solamente un administrador modifique películas, horarios, Candy y beneficios. Cada usuario puede leer su propio perfil y no puede asignarse el rol admin.

## 4. Crear el primer administrador
1. Ejecutar `npm run dev` y registrarse desde `/registro` con la cuenta que se usará como administrador.
2. En Firebase Console > Authentication > Usuarios, copiar el UID de esa cuenta.
3. En Firestore, abrir la colección `usuarios` y el documento cuyo ID es ese UID.
4. Cambiar el campo `rol` de `usuario` a `admin` desde la consola de Firebase. No agregar un selector de rol al registro.
5. Cerrar sesión y volver a entrar. La cuenta tendrá acceso a `/admin`.

La asignación inicial se hace desde la consola de confianza; el código público de registro siempre crea usuarios con `rol: "usuario"`.

## 5. Ejecutar

```bash
npm run dev
```

## Estado de esta versión
- Registro e inicio de sesión conectados a Firebase Authentication.
- Perfil guardado en Firestore.
- Panel administrativo con CRUD básico para las colecciones `peliculas`, `horarios`, `candy` y `beneficios`.
- Reglas iniciales en `firestore.rules`.

La interfaz pública existente todavía tiene componentes que muestran datos locales. Para que todos los cambios del panel se reflejen en cada página pública y para descontar stock al confirmar compras, hace falta conectar esos componentes y el flujo de compra a Firestore en una siguiente etapa. No se debe considerar completada la integración de ventas/stock hasta terminar esa conexión.
