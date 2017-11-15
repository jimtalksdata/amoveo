
//https://github.com/indutny/elliptic/blob/master/test/ecdsa-test.js

var ec = new elliptic.ec('secp256k1');
//var key = ec.genKeyPair();

//var msg = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ];
//var signature = key.sign(msg);

function toHex(str) {
    var hex = '';
    for(var i=0;i<str.length;i++) {
        l = str.charCodeAt(i).toString(16);
        var z = "";
        if (l.length < 2) { z = "0"; }
        hex += z;
	hex += ''+str.charCodeAt(i).toString(16);
    }
    return hex;
}
function fromHex(h) {
    var s = '';
    for(var i = 0; (2*i) < h.length;i++) {
        var m = h.slice((2*i), (2*(i+1)));
        var n = parseInt(m, 16);
        var l = String.fromCharCode(n);
        s = s.concat(l);
    }
    return s;
}

//var pubPoint = key1.getPublic();
/*
//first in erlang, for clarity.
serialize(X) when is_binary(X) -> 
    S = size(X),
    <<0:8, S:32, X/binary>>;
serialize(L) when is_list(L) ->
    A = serialize_list(L),
    S = size(A),
    <<1:8, S:32, A/binary>>;
serialize(X) when is_tuple(X) -> 
    A = serialize_list(tuple_to_list(X)),
    S = size(A),
    <<2:8, S:32, A/binary>>;
serialize(X) when is_integer(X) -> 
    <<3:8, X:512>>;
serialize(X) when is_atom(X) -> 
    A = list_to_binary(atom_to_list(X)),
    S = size(A),
    <<4:8, S:32, A/binary>>;
serialize(X) -> 
    io:fwrite("testnet sign serialize error"),
    io:fwrite(packer:pack(X)),
    1=2.
serialize_list([]) -> <<>>;
serialize_list([A|B]) -> 
    C = serialize(A),
    D = serialize_list(B),
    <<C/binary, D/binary>>.
*/
function serialize(data) {
    if (Number.isInteger(data)) {
        //console.log("serialize integer");
        //<<3:8, X:512>>;
        var x = integer_to_array(3, 1).concat(
            integer_to_array(data, 64));
        return x;
    } else if (Array.isArray(data)) {
        if (data[0] == -6) { //its a list.
            //console.log("serialize array");
            //<<1:8, S:32, A/binary>>;
            var d0 = data.slice(1);
            var rest = serialize_list(d0);
            return integer_to_array(1, 1).concat(
                integer_to_array(rest.length, 4)).concat(
                    rest);

        } else if (data[0] == -7) { //it is a tuple
            //console.log("serialize tuple 1");
            //<<2:8, S:32, A/binary>>;
            var d0 = data.slice(1);
            var rest = serialize_list(d0);
            return integer_to_array(2, 1).concat(
                integer_to_array(rest.length, 4)).concat(
                    rest);
        } else { //assume it is a record. a tuple where the first element is an atom. This is the only place that atoms can occur.
            //console.log("serialize tuple 2");
            var h = data[0];
            var d0 = data.slice(1);
            //<<4:8, S:32, A/binary>>;
            var atom_size = h.length;
            var first = integer_to_array(4, 1).concat(
                integer_to_array(atom_size, 4)).concat(
                    string_to_array(h));
            //console.log(JSON.stringify(first));
            var rest = first.concat(serialize_list(d0));
            return integer_to_array(2, 1).concat(
                integer_to_array(rest.length, 4)).concat(
                    rest);
        }
    } else {//assume it is a binary
        //console.log("serialize binary");
        //<<0:8, S:32, X/binary>>;
        var rest = string_to_array(atob(data));
        return integer_to_array(0, 1).concat(
            integer_to_array(rest.length, 4)).concat(
                rest);
    }
}
function serialize_list(l) {
    var m = [];
    for (var i = 0; i < l.length; i++) {
        m = m.concat(serialize(l[i]));
    }
    return m;
}
function sign(data, key) {
    //ecdsa, sha356
    var d2 = serialize(data);
    var h = hash(d2);
    var sig = key.sign(h);
    return sig.toDER();
}
function verify(data, sig0, key) {
    var sig = bin2rs(atob(atob(sig0)));
    var d2 = serialize(data);
    var h = hash(d2);
    return key.verify(h, sig, "hex");
}


signing_test();
function signing_test() {

    //priv1 = atob("2kYbRu2TECMJzZy55fxdILBvM5wJM482lKLTRu2e42U=");
    //var key1 = ec.genKeyPair({entropy: priv1});
    //var sig1 = sign([-6, 1], key1);
    //console.log(verify([-6, 1], sig1, key1));

    var stx = ["signed",["create_acc_tx","BHuqX6EKohvveqkcbyGgE247jQ5O0i2YKO27Yx50cXd+8J/dCVTnMz8QWUUS9L5oGWUx5CPtseeHddZcygmGVaM=",1,20,"BJh+CRhyKiDRSJfjUFMwUVdC/3+Ahj644HWxbLzlddhggWg+2c+h1/i9u8ono9v3l7Vb4E5WSEZouDUUH2XDI58=",150000000000],"TUVVQ0lRRDRVUjVwV1M4bWM2U1dvK2EzWDY3WlBrRnk4Mlg3cW9qNkxXTTFaUzJ1MGdJZ2JGTmlkWFdYNDJ0V2dEcUZ5aUo4NnhqWnVTMlZKNGwxTGJvcjdWeFVXckU9",[-6]];

    var data0 = stx[1];
    var sig0 = stx[2];
    var key0 = ec.keyFromPublic(toHex(atob(stx[1][1])), "hex");

    var foo = verify(data0, sig0, key0);
    console.log(foo);
}
function bin2rs(x) {
    /*
    0x30 b1 0x02 b2 (vr) 0x02 b3 (vs)
    where:

    b1 is a single byte value, equal to the length, in bytes, of the remaining list of bytes (from the first 0x02 to the end of the encoding);
    b2 is a single byte value, equal to the length, in bytes, of (vr);
    b3 is a single byte value, equal to the length, in bytes, of (vs);
    (vr) is the signed big-endian encoding of the value "r", of minimal length;
    (vs) is the signed big-endian encoding of the value "s", of minimal length.
    */
    var h = toHex(x);
    var a2 = x.charCodeAt(3);
    var r = h.slice(8, 8+(a2*2));
    var s = h.slice(12+(a2*2));
    return {"r": r, "s": s};
}
