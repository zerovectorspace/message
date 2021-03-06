<?php 

class SendMessage{
    private $clean = array();
    private $message = array();
    private $recipient;
    private $sum = 0;

    public function __construct()
    {
        $message->sender["username"] = $_SESSION["user"]["username"];
        $message->sender["public"] = $_SESSION["user"]["key"]["public"];
    }
    public function __destruct()
    {
    }
    private function recipientIsClean()
    {
        $length = mb_strlen($_POST["recipient"]);
        if (ctype_alnum($_POST["recipient"]) && $length <= 64)
        {
            $this->clean["un"] = $_POST["recipient"];
            return true;
        }
        else
        {
            return false;
        }
    }
    private function userExists()
    {
        global $globalMongo;
        if ($this->recipient = $globalMongo["userspublic"]->findone(
                array("username" => $this->clean["un"])))
        {
            $this->recipient = classToArray($this->recipient);
            $this->message["recipient"]["username"] = $this->recipient["username"];
            return 1;
        } 
        else
        {
            return 0;
        }
    }
    private function escapePlaintext()
    {

        $this->clean["plaintext"] = htmlentities($_POST["plaintext"], ENT_QUOTES);
    }
    private function encryptPlaintext()
    {
        $keypair = sodium_crypto_box_keypair_from_secretkey_and_publickey(
            hex2bin($_SESSION["user"]["key"]["secret"]), hex2bin($this->recipient["key"]["public"]));

        $this->message["nonce"] = random_bytes(SODIUM_CRYPTO_BOX_NONCEBYTES);

        $this->message["ciphertext"] = sodium_crypto_box(
            $this->clean["plaintext"], $this->message["nonce"], $keypair);
            // $this->clean["plaintext"], $this->message["nonce"], $keypair);

        $this->message["ciphertext"] = bin2hex($this->message["ciphertext"]);
        $this->message["keypair"] = bin2hex($keypair);
        $this->message["nonce"] = bin2hex($this->message["nonce"]);
    }
    private function addContact()
    {
        global $globalMongo;
        $user = $this->message["recipient"]["username"];
        $this->d = array("displayName" => $globalMongo["usersprivate"]->findone(array("username" => $user))->settings->displayName);
        $this->d = classToArray($this->d);

        $query = array('username' => $_SESSION["user"]["username"]);
        $update = array('$set' => array("contacts.$user" => $this->d));

        $globalMongo["usersprivate"]->updateOne($query, $update);
    }
    private function checkRecipientAllowance()
    {
        global $maxAllowance;
        global $globalMongo;
        $q = array("username" => $this->message["recipient"]["username"]);
        $p = array('_id' => 0, 'messages' => 1);

        $ret = $globalMongo["usersprivate"]->findone($q, $p);
        $ret = classToArray($ret);
        $this->sum = 0;
        if (isset($ret["messages"]))
        {
            foreach ($ret["messages"] as $user => $userval) {
                foreach ($ret["messages"][$user] as $time => $timeval) {
                    $this->sum += $ret["messages"][$user][$time]["size"];
                }
            }
        }
        if ($this->sum + $_POST["messageSize"] > $maxAllowance)
            return 0;
        else
            return 1;
    }
    private function send()
    {
        global $globalMongo;
        date_default_timezone_set('America/Los_Angeles');
        $date = new DateTime('NOW');

        $map["timestamp"] = $date->getTimestamp();
        $map["sender"]["username"] = $_SESSION["user"]["username"];
        $map["sender"]["displayName"] = $this->d["displayName"];
        $map["sender"]["public"] = $_SESSION["user"]["key"]["public"];
        $map["nonce"] = $this->message["nonce"];
        $map["size"] = $_POST["messageSize"];

        $time = $map["timestamp"];
        $sender = $map["sender"]["username"];

        //Save the ciphertext separatesly in the messages Collection
        //Link it to the usersprivate Collection with an the _id
        $id = bin2hex(random_bytes(16));
        $mQuery = array("ciphertext" => $this->message["ciphertext"], 
            "id" => $id);
        $globalMongo["messages"]->insertOne($mQuery);

        $map["id"] = $id;

        $query = array('username' => $this->clean["un"]);
        $update = array('$set' => array("messages.$sender.$time" => $map));
        if ($globalMongo["usersprivate"]->updateOne($query, $update))
        {
            $this->cleanup();
            return 1;
        }
        else
        {
            return 0;
        }
    }
    private function cleanup()
    {
        if(isset($this->recipient["username"]))
            sodium_memzero($this->recipient["username"]);
        if(isset($this->recipient["lastLogin"]))
            unset($this->recipient["lastLogin"]);
        if(isset($this->recipient["key"]["public"]))
            sodium_memzero($this->recipient["key"]["public"]);

        if(isset($this->message["recipient"]["username"]))
            sodium_memzero($this->message["recipient"]["username"]);
        if(isset($this->message["nonce"]))
            sodium_memzero($this->message["nonce"]);
        if(isset($this->message["ciphertext"]))
            sodium_memzero($this->message["ciphertext"]);
        if(isset($this->message["timestamp"]))
            unset($this->message["timestamp"]);
        if(isset($this->message["sender"]["username"]))
            sodium_memzero($this->message["sender"]["username"]);
        if(isset($this->message["sender"]["public"]))
            sodium_memzero($this->message["sender"]["public"]);
    }
    public function sendMessage()
    {
        $return = new Returning;

        if (!$this->recipientIsClean())
        {
            $return->exitNow(0, "Recipient name is not clean\n");
        }
        if (!$this->userExists())
        {
            $return->exitNow(0, "User does not exist\n");
        }
        $this->escapePlaintext();
        $this->encryptPlaintext();
        $this->addContact();

        if (!$this->checkRecipientAllowance())
        {
            $return->exitNow(0, "The recipient is out of storage space.");
        }
        if (!$this->send())
        {
            $return->exitNow(0, "Could not send the message\n");
        }
        $return->exitNow(1, "Message successfully sent!");
    }
}


?>
